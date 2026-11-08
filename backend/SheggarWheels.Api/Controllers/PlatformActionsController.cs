// PlatformActionsController — ports of src/actions/platform.ts (reviews,
// notification marks, admin moderation) and src/actions/announcements.ts
// (owner-submitted events & discounts with the moderation gate).
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Infrastructure;
using SheggarWheels.Api.Services;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class PlatformActionsController(AppDbContext db, CurrentUser currentUser, Notifications notify, RateLimiter rateLimiter) : ControllerBase
{
    private string ClientIp()
    {
        var forwarded = Request.Headers["x-forwarded-for"].FirstOrDefault()?.Split(',')[0].Trim();
        return forwarded ?? Request.Headers["x-real-ip"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }

    // ── Reviews (FR-29..31, BR-06) ─────────────────────────────────────────

    public record ReviewBody(string? BookingId, string? Rating, string? Comment);

    /// <summary>FR-29/30: one review per completed booking (BR-06).</summary>
    [HttpPost("/api/actions/reviews/create")]
    public async Task<IActionResult> CreateReview([FromBody] ReviewBody body)
    {
        var user = currentUser.RequireActiveUser();
        var rl = rateLimiter.Check($"review:{ClientIp()}", 5, 60_000); // 5 reviews / min / IP
        if (!rl.Ok) return Ok(new { error = $"Too many review attempts — try again in {rl.RetryAfterSec}s." });
        var error = Validators.Review(body.BookingId, body.Rating, body.Comment);
        if (error != null) return Ok(new { error });

        var booking = await db.Bookings.Include(b => b.Car).FirstOrDefaultAsync(b => b.Id == body.BookingId);
        if (booking == null || booking.RenterId != user.Id)
            return Ok(new { error = "You can only review your own completed bookings." });
        if (booking.Status != BookingStatus.COMPLETED)
            return Ok(new { error = "Only completed trips can be reviewed (BR-06)." });
        var existing = await db.Reviews.FirstOrDefaultAsync(r => r.BookingId == booking.Id);
        if (existing != null)
            return Ok(new { error = "This booking has already been reviewed (BR-06)." });

        // Same transaction as the original: review row + booking → REVIEWED together.
        using var tx = await db.Database.BeginTransactionAsync();
        db.Reviews.Add(new Review
        {
            Id = Cuid.New(), BookingId = booking.Id, CarId = booking.CarId,
            RenterId = user.Id, OwnerId = booking.OwnerId,
            Rating = int.Parse(body.Rating!), Comment = body.Comment!, CreatedAt = DateTime.UtcNow,
        });
        booking.Status = BookingStatus.REVIEWED;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await notify.NotifyAsync(booking.OwnerId, "New review on your " + booking.Car.Make + " " + booking.Car.Model,
            $"{user.Name} left a {int.Parse(body.Rating!)}-star review.", "/owner/reviews");
        return Ok(new { ok = true, message = "Review published. Thank you!" });
    }

    public record ReplyBody(string? ReviewId, string? Reply);

    /// <summary>FR-31: owner replies once to a review.</summary>
    [HttpPost("/api/actions/reviews/reply")]
    public async Task<IActionResult> ReplyToReview([FromBody] ReplyBody body)
    {
        var user = currentUser.RequireActiveUser();
        var rl = rateLimiter.Check($"reply:{ClientIp()}", 10, 60_000); // 10 replies / min / IP
        if (!rl.Ok) return Ok(new { error = $"Too many attempts — try again in {rl.RetryAfterSec}s." });
        var error = Validators.Reply(body.ReviewId, body.Reply);
        if (error != null) return Ok(new { error });

        var review = await db.Reviews.FirstOrDefaultAsync(r => r.Id == body.ReviewId);
        if (review == null || review.OwnerId != user.Id)
            return Ok(new { error = "Only the car's owner can reply to this review." });
        if (review.OwnerReply != null)
            return Ok(new { error = "You have already replied to this review." });

        review.OwnerReply = body.Reply;
        review.RepliedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(review.RenterId, "The owner replied to your review",
            "Your review received a public reply.", "/bookings/" + review.BookingId);
        return Ok(new { ok = true, message = "Reply published." });
    }

    // ── Notification marks (FR-46) ─────────────────────────────────────────

    public record IdOnly(string? Id);
    public record MarkReadBody(string? Id, bool All = false);

    [HttpPost("/api/actions/notifications/read")]
    public async Task<IActionResult> MarkRead([FromBody] MarkReadBody body)
    {
        var user = currentUser.RequireActiveUser();
        if (body.All)
        {
            // mark-all: every unseen row of this user becomes read (FR-46).
            await db.Notifications
                .Where(n => n.UserId == user.Id && !n.Read)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.Read, true));
        }
        else
        {
            await db.Notifications
                .Where(n => n.Id == body.Id && n.UserId == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.Read, true));
        }
        return Ok(new { ok = true });
    }

    // ── Admin moderation (FR-40..44) ───────────────────────────────────────

    /// <summary>FR-40 / BR-02: approve a pending listing.</summary>
    [HttpPost("/api/actions/admin/approve-listing")]
    public async Task<IActionResult> ApproveListing([FromBody] IdOnly body)
    {
        var admin = currentUser.RequireRole(Role.ADMIN);
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == body.Id);
        if (car == null || car.Status is not (CarStatus.PENDING or CarStatus.REJECTED)) return Ok(new { ok = true });
        car.Status = CarStatus.APPROVED;
        car.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(car.OwnerId, "Listing approved",
            $"Your {car.Make} {car.Model} is now live in the catalogue.", "/owner/cars");
        _ = admin;
        return Ok(new { ok = true });
    }

    /// <summary>FR-40 / BR-02: reject a listing.</summary>
    [HttpPost("/api/actions/admin/reject-listing")]
    public async Task<IActionResult> RejectListing([FromBody] IdOnly body)
    {
        currentUser.RequireRole(Role.ADMIN);
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == body.Id);
        if (car == null || car.Status is not (CarStatus.PENDING or CarStatus.APPROVED)) return Ok(new { ok = true });
        car.Status = CarStatus.REJECTED;
        car.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(car.OwnerId, "Listing rejected",
            $"Your {car.Make} {car.Model} was not approved. Edit the listing and resubmit it.", "/owner/cars");
        return Ok(new { ok = true });
    }

    /// <summary>FR-41 / BR-10: suspend a demo account. Admin accounts cannot be suspended.</summary>
    [HttpPost("/api/actions/admin/suspend-user")]
    public async Task<IActionResult> SuspendUser([FromBody] IdOnly body)
    {
        var admin = currentUser.RequireRole(Role.ADMIN);
        var userId = body.Id ?? "";
        if (userId == admin.Id) return Ok(new { ok = true });
        var target = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (target == null || target.Roles.Contains(Role.ADMIN)) return Ok(new { ok = true });
        target.Status = UserStatus.SUSPENDED;
        target.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(userId, "Account suspended",
            "Your account was suspended by the admin. You cannot perform actions until reinstated.");
        return Ok(new { ok = true });
    }

    /// <summary>FR-41: reinstate a suspended account.</summary>
    [HttpPost("/api/actions/admin/reinstate-user")]
    public async Task<IActionResult> ReinstateUser([FromBody] IdOnly body)
    {
        currentUser.RequireRole(Role.ADMIN);
        var target = await db.Users.FirstOrDefaultAsync(u => u.Id == body.Id);
        if (target == null) return Ok(new { ok = true });
        target.Status = UserStatus.ACTIVE;
        target.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(target.Id, "Account reinstated", "Your account is active again. Welcome back!");
        return Ok(new { ok = true });
    }

    public record ResolveDisputeBody(string? DisputeId, string? Notes);

    /// <summary>FR-43 / BR-07: resolve a dispute with recorded notes; booking restored.</summary>
    [HttpPost("/api/actions/admin/resolve-dispute")]
    public async Task<IActionResult> ResolveDispute([FromBody] ResolveDisputeBody body)
    {
        var admin = currentUser.RequireRole(Role.ADMIN);
        var error = Validators.ResolveDispute(body.DisputeId, body.Notes);
        if (error != null) return Ok(new { error });

        var dispute = await db.Disputes
            .Include(d => d.Booking).ThenInclude(b => b.Car)
            .FirstOrDefaultAsync(d => d.Id == body.DisputeId);
        if (dispute == null || dispute.Status != DisputeStatus.OPEN)
            return Ok(new { error = "This dispute is not open." });
        var booking = dispute.Booking;

        // Same transaction as the original: dispute resolved + booking restored.
        using var tx = await db.Database.BeginTransactionAsync();
        dispute.Status = DisputeStatus.RESOLVED;
        dispute.ResolutionNotes = body.Notes;
        dispute.ResolvedById = admin.Id;
        dispute.ResolvedAt = DateTime.UtcNow;
        booking.Status = BookingStatus.COMPLETED;
        booking.StatusBeforeDispute = null;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        var note = $"The admin resolved the dispute on the {booking.Car.Make} {booking.Car.Model}: \"{body.Notes}\"";
        await notify.NotifyAsync(booking.RenterId, "Dispute resolved", note, "/bookings/" + booking.Id);
        await notify.NotifyAsync(booking.OwnerId, "Dispute resolved", note, "/bookings/" + booking.Id);
        return Ok(new { ok = true, message = "Dispute resolved and parties notified." });
    }

    public record AnnouncementBody(string? Title, string? Body);

    /// <summary>FR-44: create an announcement and fan it out in-app (BR-12).</summary>
    [HttpPost("/api/actions/admin/create-announcement")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] AnnouncementBody body)
    {
        var admin = currentUser.RequireRole(Role.ADMIN);
        var error = Validators.Announcement(body.Title, body.Body);
        if (error != null) return Ok(new { error });

        db.Announcements.Add(new Announcement
        {
            Id = Cuid.New(), Title = body.Title!, Body = body.Body!,
            Kind = AnnouncementKind.NEWS, Active = true, CreatedById = admin.Id, CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        await notify.NotifyAllUsersAsync("Platform announcement", body.Title!, "/dashboard");
        return Ok(new { ok = true, message = "Announcement published to all active users." });
    }

    /// <summary>FR-44: toggle an announcement's active flag (also the approval door).</summary>
    [HttpPost("/api/actions/admin/toggle-announcement")]
    public async Task<IActionResult> ToggleAnnouncement([FromBody] IdOnly body)
    {
        currentUser.RequireRole(Role.ADMIN);
        var a = await db.Announcements.FirstOrDefaultAsync(x => x.Id == body.Id);
        if (a == null) return Ok(new { ok = true });
        a.Active = !a.Active;
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // ── Owner-submitted announcements (FR-44 extension, moderation gate) ───

    public record OwnerAnnouncementBody(string? Title, string? Body, string? Kind,
        string? DiscountPercent, string? CarId, string? ValidUntil);

    /// <summary>Owners submit as active=false; an admin publishes from /admin/announcements.</summary>
    [HttpPost("/api/actions/announcements/owner-create")]
    public async Task<IActionResult> CreateOwnerAnnouncement([FromBody] OwnerAnnouncementBody body)
    {
        var owner = currentUser.RequireRole(Role.OWNER);

        var title = (body.Title ?? "").Trim();
        var text = (body.Body ?? "").Trim();
        var kind = body.Kind ?? "";
        var carId = (body.CarId ?? "").Trim();
        var untilRaw = (body.ValidUntil ?? "").Trim();

        if (title.Length < 4 || title.Length > 120) return Ok(new { error = "Title must be between 4 and 120 characters." });
        if (text.Length < 10 || text.Length > 400)
            return Ok(new { error = "Describe it in 10-400 characters — include the rules (who qualifies, minimum days, etc.)." });
        if (kind is not ("EVENT" or "DISCOUNT")) return Ok(new { error = "Choose event or discount." });
        var percent = int.TryParse(body.DiscountPercent, out var p) ? p : -1;
        if (kind == "DISCOUNT" && percent is < 5 or > 70)
            return Ok(new { error = "Discount must be a whole number between 5 and 70 percent." });

        // A DISCOUNT must target exactly one of the OWNER'S OWN cars (BR-11: the
        // <select> options are not trusted either).
        string? targetCarId = null;
        if (kind == "DISCOUNT")
        {
            if (string.IsNullOrEmpty(carId))
                return Ok(new { error = "Pick which of your cars the discount applies to." });
            var car = await db.Cars.Where(c => c.Id == carId).Select(c => new { c.OwnerId }).FirstOrDefaultAsync();
            if (car == null || car.OwnerId != owner.Id)
                return Ok(new { error = "That car is not one of yours — pick a car from your own listings." });
            targetCarId = carId;
        }

        DateTime? validUntil = null;
        if (untilRaw.Length > 0)
        {
            validUntil = DateTime.SpecifyKind(DateTime.Parse(untilRaw).Date.AddHours(23).AddMinutes(59).AddSeconds(59), DateTimeKind.Unspecified);
            if (validUntil < DateTime.UtcNow)
                return Ok(new { error = "The end date must be today or later." });
        }

        db.Announcements.Add(new Announcement
        {
            Id = Cuid.New(), Title = title, Body = text,
            Kind = Enum.Parse<AnnouncementKind>(kind),
            DiscountPercent = kind == "DISCOUNT" ? percent : null,
            CarId = targetCarId, ValidUntil = validUntil,
            Active = false, // moderation gate: admin publishes
            CreatedById = owner.Id, CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        return Ok(new { ok = true, message = "Sent to the admin for approval — it joins the home banner once approved." });
    }
}
