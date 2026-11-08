// BookingsActionsController — ports of src/actions/bookings.ts: the booking
// lifecycle (FR-17..24, BR-03..05, BR-11). Every mutation re-checks session,
// role, ownership, and state server-side — UI affordances are not trusted.
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Infrastructure;
using SheggarWheels.Api.Services;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class BookingsActionsController(
    AppDbContext db,
    CurrentUser currentUser,
    Notifications notify,
    RateLimiter rateLimiter) : ControllerBase
{
    private const string RentalTermsVersion = "v2"; // lib/terms.ts RENTAL_TERMS_VERSION
    private const string PaymentTermsVersion = "v1"; // lib/terms.ts PAYMENT_TERMS_VERSION

    private string ClientIp()
    {
        var forwarded = Request.Headers["x-forwarded-for"].FirstOrDefault()?.Split(',')[0].Trim();
        return forwarded ?? Request.Headers["x-real-ip"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }

    private async Task<Booking?> GetBookingAsync(string id)
    {
        return await db.Bookings
            .Include(b => b.Car)
            .Include(b => b.Owner)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public record RequestBookingBody(string? CarId, string? StartDate, string? EndDate, string? DriveMode,
        string? DriverName, string? DriverLicenseNumber, string? DriverLicenseImage,
        string? TermsAgreed, string? TermsVersion);

    /// <summary>FR-17/18 + FR-49: create a request with a server-side price snapshot and
    /// the drive mode. Every licence travels WITH the request (Turo-style) and the car
    /// OWNER approves or rejects it together with the booking.</summary>
    [HttpPost("/api/actions/bookings/request")]
    public async Task<IActionResult> RequestBooking([FromBody] RequestBookingBody body)
    {
        var user = currentUser.RequireActiveUser();
        var rl = rateLimiter.Check($"booking:{ClientIp()}", 10, 60_000); // 10 requests / min / IP
        if (!rl.Ok) return Ok(new { error = $"Too many booking attempts — try again in {rl.RetryAfterSec}s." });

        var input = new Validators.BookingInput(body.CarId ?? "", body.StartDate ?? "", body.EndDate ?? "",
            body.DriveMode ?? "", body.DriverName, body.DriverLicenseNumber, body.DriverLicenseImage);
        var error = Validators.Booking(input);
        if (error != null) return Ok(new { error });

        var driveMode = Enum.Parse<DriveMode>(input.DriveMode);
        // FR-51 clickwrap gate (BR-11 spirit — never trust the UI): the request is
        // only valid if the current rental-terms version was accepted in this submission.
        if (body.TermsAgreed != "1" || body.TermsVersion != RentalTermsVersion)
            return Ok(new { error = "Please accept the rental rules before requesting a booking." });

        var start = DateTime.SpecifyKind(DateTime.Parse(input.StartDate).Date, DateTimeKind.Unspecified);
        var end = DateTime.SpecifyKind(DateTime.Parse(input.EndDate).Date, DateTimeKind.Unspecified);

        // Effective owner-driver fee: only when the renter picked OWNER_DRIVER.
        var carProbe = await db.Cars.Where(c => c.Id == input.CarId).Select(c => new { c.DriverFeePerDay }).FirstOrDefaultAsync();
        var ownerDriverFee = driveMode == DriveMode.OWNER_DRIVER ? carProbe?.DriverFeePerDay ?? 0 : 0;
        if (driveMode == DriveMode.OWNER_DRIVER && ownerDriverFee == 0)
            return Ok(new { error = "This owner does not offer a driver for this car — choose self-drive or bring your own driver." });

        var result = await BookingRules.ValidateNewBookingAsync(db, input.CarId, start, end, null, ownerDriverFee);
        if (!result.Ok) return Ok(new { error = result.Error });
        var car = result.Car!;

        // Licence snapshot per mode — the OWNER reviews it with the request.
        string? licenseNumber;
        string? licenseImage;
        var licenseStatus = LicenseStatus.PENDING;
        if (driveMode == DriveMode.OWNER_DRIVER)
        {
            licenseNumber = null;
            licenseImage = null;
            licenseStatus = LicenseStatus.APPROVED; // owner vouches for their driver
        }
        else
        {
            licenseNumber = input.DriverLicenseNumber!;
            licenseImage = input.DriverLicenseImage!;
        }

        var booking = new Booking
        {
            Id = Cuid.New(),
            CarId = car.Id, RenterId = user.Id, OwnerId = car.OwnerId,
            StartDate = start, EndDate = end, Days = result.Totals!.Days,
            PricePerDay = car.PricePerDay, Subtotal = result.Totals.Subtotal,
            DiscountPercent = result.Totals.DiscountPercent, DiscountAmount = result.Totals.DiscountAmount,
            // FR-49 snapshots: driver fee is frozen with the price (BR-03).
            DriveMode = driveMode,
            DriverName = driveMode == DriveMode.OWN_DRIVER ? input.DriverName! : null,
            DriverFeePerDay = result.Totals.DriverFeePerDay, DriverTotal = result.Totals.DriverTotal,
            Fee = result.Totals.Fee, Total = result.Totals.Total,
            // FR-51: clickwrap proof stamped by the SERVER with the accepted version.
            TermsVersion = RentalTermsVersion, TermsAgreedAt = DateTime.UtcNow,
            Status = BookingStatus.REQUESTED, PaymentStatus = PaymentStatus.UNPAID,
            LicenseNumber = licenseNumber, LicenseImage = licenseImage, LicenseStatus = licenseStatus,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var modeLine = driveMode switch
        {
            DriveMode.SELF_DRIVE => "Self-drive — the renter's own driving licence is attached, review it before approving.",
            DriveMode.OWN_DRIVER => $"Own driver ({input.DriverName}) — driver's licence attached, review it before approving.",
            _ => "With your professional driver — no licence review needed.",
        };
        await notify.NotifyAsync(car.OwnerId, "New booking request",
            $"{user.Name} requested your {car.Make} {car.Model} for {FormatDate(start)} - {FormatDate(end)} ({FormatEtb(booking.Total)}). {modeLine}",
            "/owner/cars/" + car.Id + "/bookings");
        return Ok(new { ok = true, redirect = "/bookings/" + booking.Id });
    }

    /// <summary>FR-20: owner approves — overlap re-check (BR-05). Approving the request
    /// also approves the submitted driving licence.</summary>
    [HttpPost("/api/actions/bookings/approve")]
    public async Task<IActionResult> Approve([FromBody] IdBody body)
    {
        var user = currentUser.RequireActiveUser();
        var booking = await GetBookingAsync(body.BookingId ?? "");
        if (booking == null || booking.OwnerId != user.Id)
            return Ok(new { error = "You are not allowed to manage this booking." });
        if (!BookingRules.CanTransition(booking.Status, BookingStatus.CONFIRMED))
            return Ok(new { error = $"This booking is {booking.Status.ToString().ToLowerInvariant()} and can no longer be approved." });
        var conflict = await BookingRules.FindConflictAsync(db, booking.CarId, booking.StartDate, booking.EndDate, booking.Id, BookingRules.HardHoldStatuses);
        if (conflict != null)
            return Ok(new { error = "Another confirmed booking already covers these dates — approval refused (BR-05)." });

        booking.Status = BookingStatus.CONFIRMED;
        booking.LicenseStatus = LicenseStatus.APPROVED;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(booking.RenterId, "Booking confirmed",
            $"Your {booking.Car.Make} {booking.Car.Model} trip from {FormatDate(booking.StartDate)} is confirmed{(booking.DriveMode != DriveMode.OWNER_DRIVER ? " — the submitted licence was approved" : "")}. Pick a payment method at checkout (TeleBirr, CBE Birr, M-Pesa or Chapa).",
            "/bookings/" + booking.Id);
        return Ok(new
        {
            ok = true,
            message = booking.DriveMode != DriveMode.OWNER_DRIVER
                ? "Booking confirmed — licence approved. The renter can now pay at checkout."
                : "Booking confirmed. The renter can now pay at checkout.",
        });
    }

    /// <summary>FR-20: owner declines — the driving licence is rejected with it (optional reason).</summary>
    [HttpPost("/api/actions/bookings/decline")]
    public async Task<IActionResult> Decline([FromBody] DeclineBody body)
    {
        var user = currentUser.RequireActiveUser();
        var booking = await GetBookingAsync(body.BookingId ?? "");
        if (booking == null || booking.OwnerId != user.Id)
            return Ok(new { error = "You are not allowed to manage this booking." });
        if (!BookingRules.CanTransition(booking.Status, BookingStatus.DECLINED))
            return Ok(new { error = $"This booking is {booking.Status.ToString().ToLowerInvariant()} and cannot be declined." });

        var note = (body.LicenseDecisionNote ?? "").Trim();
        if (note.Length > 300) note = note[..300];
        booking.Status = BookingStatus.DECLINED;
        booking.LicenseStatus = LicenseStatus.REJECTED;
        if (note.Length > 0) booking.LicenseDecisionNote = note;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(booking.RenterId, "Booking declined",
            $"The owner declined your request for the {booking.Car.Make} {booking.Car.Model}.{(note.Length > 0 ? $" Reason: {note}" : " No payment was taken.")}",
            "/bookings/" + booking.Id);
        return Ok(new { ok = true, message = "Request declined." });
    }

    /// <summary>FR-21: renter cancels when the lifecycle permits it.</summary>
    [HttpPost("/api/actions/bookings/cancel")]
    public async Task<IActionResult> Cancel([FromBody] IdBody body)
    {
        var user = currentUser.RequireActiveUser();
        var booking = await GetBookingAsync(body.BookingId ?? "");
        if (booking == null || booking.RenterId != user.Id)
            return Ok(new { error = "Only the renter can cancel this booking." });
        if (!BookingRules.CanTransition(booking.Status, BookingStatus.CANCELLED))
            return Ok(new { error = $"A {booking.Status.ToString().ToLowerInvariant()} booking cannot be cancelled." });
        if (booking.Status == BookingStatus.CONFIRMED && booking.StartDate <= DateTime.UtcNow)
            return Ok(new { error = "The trip has already started — cancellation is no longer permitted." });

        var refund = booking.PaymentStatus == PaymentStatus.HELD;
        booking.Status = BookingStatus.CANCELLED;
        booking.PaymentStatus = refund ? PaymentStatus.REFUNDED : booking.PaymentStatus;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(booking.OwnerId, "Booking cancelled",
            $"{user.Name} cancelled the {booking.Car.Make} {booking.Car.Model} trip ({FormatDate(booking.StartDate)}).{(refund ? " The held payment was refunded." : "")}",
            "/owner/cars/" + booking.CarId + "/bookings");
        return Ok(new { ok = true, message = refund ? "Booking cancelled — held payment refunded (demo)." : "Booking cancelled." });
    }

    /// <summary>FR-22: owner marks pickup (demo trip tracking becomes eligible).</summary>
    [HttpPost("/api/actions/bookings/start-trip")]
    public async Task<IActionResult> StartTrip([FromBody] IdBody body)
    {
        var user = currentUser.RequireActiveUser();
        var booking = await GetBookingAsync(body.BookingId ?? "");
        if (booking == null || booking.OwnerId != user.Id)
            return Ok(new { error = "You are not allowed to manage this booking." });
        if (!BookingRules.CanTransition(booking.Status, BookingStatus.IN_PROGRESS))
            return Ok(new { error = $"Cannot start a {booking.Status.ToString().ToLowerInvariant()} booking." });

        booking.Status = BookingStatus.IN_PROGRESS;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(booking.RenterId, "Trip started",
            $"The {booking.Car.Make} {booking.Car.Model} handover is done. Track your simulated trip from the booking page.",
            "/bookings/" + booking.Id);
        return Ok(new { ok = true, message = "Trip marked as started." });
    }

    /// <summary>FR-22 + escrow release: owner marks return; held funds become paid.</summary>
    [HttpPost("/api/actions/bookings/complete-trip")]
    public async Task<IActionResult> CompleteTrip([FromBody] IdBody body)
    {
        var user = currentUser.RequireActiveUser();
        var booking = await GetBookingAsync(body.BookingId ?? "");
        if (booking == null || booking.OwnerId != user.Id)
            return Ok(new { error = "You are not allowed to manage this booking." });
        if (!BookingRules.CanTransition(booking.Status, BookingStatus.COMPLETED))
            return Ok(new { error = $"Cannot complete a {booking.Status.ToString().ToLowerInvariant()} booking." });

        var release = booking.PaymentStatus == PaymentStatus.HELD;
        booking.Status = BookingStatus.COMPLETED;
        if (release) booking.PaymentStatus = PaymentStatus.PAID;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(booking.RenterId, "Trip completed",
            release
                ? $"The {booking.Car.Make} {booking.Car.Model} trip is complete — the held payment was released to the owner. Leave a review!"
                : $"The {booking.Car.Make} {booking.Car.Model} trip is complete. Leave a review!",
            "/bookings/" + booking.Id);
        return Ok(new { ok = true, message = release ? "Trip completed — held payment released to the owner." : "Trip completed." });
    }

    public record PayBody(string? BookingId, string? Method, string? Contact, string? PaymentTermsAgreed, string? PaymentTermsVersion);

    /// <summary>FR-23/24: multi-method checkout — money is HELD in escrow until trip completion.</summary>
    [HttpPost("/api/actions/bookings/pay")]
    public async Task<IActionResult> Pay([FromBody] PayBody body)
    {
        var user = currentUser.RequireActiveUser();
        var rl = rateLimiter.Check($"pay:{ClientIp()}", 6, 60_000); // 6 payment attempts / min / IP
        if (!rl.Ok) return Ok(new { error = $"Too many payment attempts — try again in {rl.RetryAfterSec}s." });

        var error = Validators.Payment(body.BookingId, body.Method, body.Contact);
        if (error != null) return Ok(new { error });
        var method = PaymentsRegistry.Get(body.Method!) ?? throw new InvalidOperationException("Unknown payment method");
        // FR-51 clickwrap gate: payment terms must be accepted in this submission.
        if (body.PaymentTermsAgreed != "1" || body.PaymentTermsVersion != PaymentTermsVersion)
            return Ok(new { error = "Please accept the payment & escrow terms before paying." });

        var booking = await GetBookingAsync(body.BookingId!);
        if (booking == null || booking.RenterId != user.Id)
            return Ok(new { error = "You are not allowed to pay for this booking." });
        if (booking.Status != BookingStatus.CONFIRMED)
            return Ok(new { error = "Only a confirmed booking can be paid for." });
        if (booking.PaymentStatus != PaymentStatus.UNPAID)
            return Ok(new { error = "This booking has already been paid." }); // idempotency guard

        var paymentRef = BookingRules.DemoPaymentRef(method.RefPrefix);
        booking.PaymentStatus = PaymentStatus.HELD;
        booking.PaymentRef = paymentRef;
        booking.PaymentMethod = method.Label;
        booking.PaymentTermsVersion = PaymentTermsVersion;
        booking.PaymentTermsAgreedAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await notify.NotifyAsync(booking.OwnerId, "Payment held in escrow",
            $"{user.Name} paid {FormatEtb(booking.Total)} via {method.Label} for the {booking.Car.Make} {booking.Car.Model}. It stays in escrow until the trip completes (Ref {paymentRef}).",
            "/bookings/" + booking.Id);
        await notify.NotifyAdminsAsync("Payment held in escrow",
            $"{user.Name} paid {FormatEtb(booking.Total)} via {method.Label} for {booking.Owner.Name}'s {booking.Car.Make} {booking.Car.Model}. Ref {paymentRef}.",
            "/admin/bookings");
        return Ok(new { ok = true, redirect = "/bookings/" + booking.Id + "?paid=1" });
    }

    /// <summary>FR-39/43: either party opens a dispute (BR-07).</summary>
    [HttpPost("/api/actions/bookings/open-dispute")]
    public async Task<IActionResult> OpenDispute([FromBody] DisputeBody body)
    {
        var user = currentUser.RequireActiveUser();
        var rl = rateLimiter.Check($"dispute:{ClientIp()}", 5, 60_000); // 5 disputes / min / IP
        if (!rl.Ok) return Ok(new { error = $"Too many attempts — try again in {rl.RetryAfterSec}s." });
        var error = Validators.Dispute(body.BookingId, body.Reason);
        if (error != null) return Ok(new { error });

        var booking = await GetBookingAsync(body.BookingId!);
        if (booking == null || (booking.RenterId != user.Id && booking.OwnerId != user.Id))
            return Ok(new { error = "Only the renter or owner of this booking can open a dispute (BR-07)." });
        BookingStatus[] allowed = [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.REVIEWED];
        if (!allowed.Contains(booking.Status))
            return Ok(new { error = $"A dispute cannot be opened on a {booking.Status.ToString().ToLowerInvariant()} booking." });
        BookingRules.AssertTransition(booking.Status, BookingStatus.DISPUTED);

        // Same transaction as the original: booking → DISPUTED with the pre-dispute
        // status snapshot, plus the dispute row — committed together or not at all.
        var statusBefore = booking.Status; // captured BEFORE the update (BR-07 restore)
        using var tx = await db.Database.BeginTransactionAsync();
        booking.Status = BookingStatus.DISPUTED;
        booking.StatusBeforeDispute = statusBefore;
        booking.UpdatedAt = DateTime.UtcNow;
        db.Disputes.Add(new Dispute
        {
            Id = Cuid.New(), BookingId = booking.Id, OpenedById = user.Id,
            Reason = body.Reason!, Status = DisputeStatus.OPEN, CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        var other = booking.RenterId == user.Id ? booking.OwnerId : booking.RenterId;
        await notify.NotifyAsync(other, "Dispute opened",
            $"{user.Name} opened a dispute on the {booking.Car.Make} {booking.Car.Model} booking. The admin will review it.",
            "/bookings/" + booking.Id);
        await notify.NotifyAdminsAsync("New dispute opened",
            $"A dispute on the {booking.Car.Make} {booking.Car.Model} ({FormatDate(booking.StartDate)}) needs review.",
            "/admin/disputes");
        return Ok(new { ok = true, message = "Dispute opened. The admin has been notified." });
    }

    public record IdBody(string? BookingId);
    public record DeclineBody(string? BookingId, string? LicenseDecisionNote);
    public record DisputeBody(string? BookingId, string? Reason);

    // Formatting helpers — same output as lib/pricing.ts formatETB/formatDate.
    internal static string FormatEtb(int n) => "ETB " + n.ToString("N0", new System.Globalization.CultureInfo("en-US"));
    internal static string FormatDate(DateTime d) =>
        d.ToString("d MMM yyyy", System.Globalization.CultureInfo.InvariantCulture);
}
