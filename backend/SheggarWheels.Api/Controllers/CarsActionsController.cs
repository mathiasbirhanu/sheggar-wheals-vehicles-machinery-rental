// CarsActionsController — ports of src/actions/cars.ts (owner listing actions):
// FR-32 create, FR-33 edit/toggle, FR-35 blocked dates. Every mutation re-checks
// session, role and ownership server-side (BR-11) — UI affordances are not trusted.
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Infrastructure;
using SheggarWheels.Api.Services;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class CarsActionsController(AppDbContext db, CurrentUser currentUser, Notifications notify, RateLimiter rateLimiter) : ControllerBase
{
    private string ClientIp()
    {
        var forwarded = Request.Headers["x-forwarded-for"].FirstOrDefault()?.Split(',')[0].Trim();
        return forwarded ?? Request.Headers["x-real-ip"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }

    private async Task<Car?> OwnCarAsync(string carId, string userId)
    {
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == carId);
        return car != null && car.OwnerId == userId ? car : null;
    }

    public record CarActionBody(
        string? CarId, string? Make, string? Model, string? Year, string? Transmission, string? FuelType,
        string? Seats, string? City, string? Neighbourhood, string? PricePerDay, string? Description,
        List<string>? Photos, string? ValuationDoc, string? ValuationAmount, string? DriverFeePerDay);

    /// <summary>FR-32: create a listing; it starts PENDING for admin moderation (BR-02).</summary>
    [HttpPost("/api/actions/cars/create")]
    public async Task<IActionResult> Create([FromBody] CarActionBody body)
    {
        var user = currentUser.RequireRole(Role.OWNER);
        var rl = rateLimiter.Check($"car-create:{ClientIp()}", 5, 60_000); // 5 listings / min / IP (spam guard)
        if (!rl.Ok) return Ok(new { error = $"Too many listing attempts — try again in {rl.RetryAfterSec}s." });

        var photos = (body.Photos ?? []).Where(p => !string.IsNullOrEmpty(p)).ToList();
        var input = new Validators.CarInput(
            body.Make ?? "", body.Model ?? "", body.Year, body.Transmission ?? "", body.FuelType ?? "PETROL",
            body.Seats, body.City ?? "Addis Ababa", body.Neighbourhood ?? "", body.PricePerDay,
            body.Description ?? "", photos, body.ValuationDoc, body.ValuationAmount, body.DriverFeePerDay);
        var error = Validators.Car(input);
        if (error != null) return Ok(new { error });

        var car = new Car
        {
            Id = Cuid.New(),
            OwnerId = user.Id,
            Make = input.Make,
            Model = input.Model,
            Year = int.Parse(input.YearRaw!),
            Transmission = Enum.Parse<Transmission>(input.Transmission),
            FuelType = Enum.Parse<FuelType>(input.FuelType),
            Seats = int.Parse(input.SeatsRaw!),
            City = input.City,
            Neighbourhood = input.Neighbourhood,
            PricePerDay = int.Parse(input.PriceRaw!),
            Description = input.Description,
            Photos = photos,
            // FR-47: required by validation — a value must be present.
            ValuationDoc = input.ValuationDoc,
            ValuationAmount = string.IsNullOrWhiteSpace(input.ValuationAmountRaw) ? null : int.Parse(input.ValuationAmountRaw!),
            // FR-49: optional owner-driver fee.
            DriverFeePerDay = string.IsNullOrWhiteSpace(input.DriverFeeRaw) ? null : int.Parse(input.DriverFeeRaw!),
            // Seeded sample coordinate (C7), never live GPS.
            Lat = 9.0054 + (Random.Shared.NextDouble() - 0.5) * 0.02,
            Lng = 38.7636 + (Random.Shared.NextDouble() - 0.5) * 0.02,
            Status = CarStatus.PENDING,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Cars.Add(car);
        await db.SaveChangesAsync();

        await notify.NotifyAdminsAsync("New listing awaiting moderation",
            $"{user.Name} listed a {input.Make} {input.Model}.", "/admin/listings");
        return Ok(new { ok = true, redirect = "/owner", carId = car.Id });
    }

    /// <summary>FR-33: edit own listing. Existing bookings keep their snapshots (BR-03).</summary>
    [HttpPost("/api/actions/cars/update")]
    public async Task<IActionResult> Update([FromBody] CarActionBody body)
    {
        var user = currentUser.RequireActiveUser();
        var car = await OwnCarAsync(body.CarId ?? "", user.Id);
        if (car == null) return Ok(new { error = "You can only edit your own listings (NT-04)." });

        var photos = (body.Photos ?? []).Where(p => !string.IsNullOrEmpty(p)).ToList();
        var input = new Validators.CarInput(
            body.Make ?? "", body.Model ?? "", body.Year, body.Transmission ?? "", body.FuelType ?? "PETROL",
            body.Seats, body.City ?? "Addis Ababa", body.Neighbourhood ?? "", body.PricePerDay,
            body.Description ?? "", photos, body.ValuationDoc, body.ValuationAmount, body.DriverFeePerDay);
        var error = Validators.Car(input);
        if (error != null) return Ok(new { error });

        car.Make = input.Make;
        car.Model = input.Model;
        car.Year = int.Parse(input.YearRaw!);
        car.Transmission = Enum.Parse<Transmission>(input.Transmission);
        car.FuelType = Enum.Parse<FuelType>(input.FuelType);
        car.Seats = int.Parse(input.SeatsRaw!);
        car.City = input.City;
        car.Neighbourhood = input.Neighbourhood;
        car.PricePerDay = int.Parse(input.PriceRaw!);
        car.Description = input.Description;
        car.Photos = photos;
        car.ValuationDoc = input.ValuationDoc;
        car.ValuationAmount = string.IsNullOrWhiteSpace(input.ValuationAmountRaw) ? null : int.Parse(input.ValuationAmountRaw!);
        // An emptied driver-fee field REMOVES the owner-driver option (BR-03: existing
        // bookings keep their frozen driver snapshot).
        car.DriverFeePerDay = string.IsNullOrWhiteSpace(input.DriverFeeRaw) ? null : int.Parse(input.DriverFeeRaw!);
        car.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { ok = true, message = "Listing updated. Existing bookings keep their original prices (BR-03)." });
    }

    /// <summary>FR-33: owner activates/deactivates an approved listing.</summary>
    [HttpPost("/api/actions/cars/toggle-active")]
    public async Task<IActionResult> ToggleActive([FromBody] CarActionBody body)
    {
        var user = currentUser.RequireActiveUser();
        var car = await OwnCarAsync(body.CarId ?? "", user.Id);
        if (car == null) return Ok(new { error = "You can only manage your own listings." });
        if (car.Status is not (CarStatus.APPROVED or CarStatus.INACTIVE))
            return Ok(new { error = "Only approved listings can be deactivated or re-activated (BR-02)." });

        car.Status = car.Status == CarStatus.APPROVED ? CarStatus.INACTIVE : CarStatus.APPROVED;
        car.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new
        {
            ok = true,
            message = car.Status == CarStatus.APPROVED
                ? "Listing deactivated and hidden from the catalogue."
                : "Listing re-activated.",
        });
    }

    public record BlockedDatesBody(string? CarId, List<string>? Dates);
    public record BlockedDateBody(string? CarId, string? Date);

    /// <summary>FR-35: add blocked dates; dates clashing with active bookings are refused.</summary>
    [HttpPost("/api/actions/cars/block-dates")]
    public async Task<IActionResult> BlockDates([FromBody] BlockedDatesBody body)
    {
        var user = currentUser.RequireActiveUser();
        var car = await OwnCarAsync(body.CarId ?? "", user.Id);
        if (car == null) return Ok(new { error = "You can only manage your own listings." });

        var dates = (body.Dates ?? [])
            .Where(s => !string.IsNullOrEmpty(s) && System.Text.RegularExpressions.Regex.IsMatch(s, @"^\d{4}-\d{2}-\d{2}$"))
            .Distinct()
            .ToList();
        if (dates.Count == 0) return Ok(new { error = "Pick at least one date to block." });

        var actives = await db.Bookings
            .Where(b => b.CarId == car.Id && BookingRules.BlockingStatuses.Contains(b.Status))
            .ToListAsync();
        var blocked = car.UnavailableDates.Select(d => d.Date.ToString("yyyy-MM-dd")).ToHashSet();
        var rejected = new List<string>();
        foreach (var dateStr in dates)
        {
            var day = DateTime.Parse(dateStr).Date;
            var clash = actives.Any(b => Pricing.RangesOverlap(day, day, b.StartDate, b.EndDate));
            if (clash) rejected.Add(dateStr);
            else blocked.Add(dateStr);
        }
        car.UnavailableDates = blocked.Order().Select(s => DateTime.SpecifyKind(DateTime.Parse(s).Date, DateTimeKind.Unspecified)).ToList();
        car.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        if (rejected.Count == dates.Count)
            return Ok(new { error = "None of those dates could be blocked — they overlap active bookings." });
        var message = rejected.Count > 0
            ? $"Blocked {dates.Count - rejected.Count} date(s). {rejected.Count} overlapped active booking(s) and were refused."
            : $"Blocked {dates.Count} date(s).";
        return Ok(new { ok = true, message });
    }

    /// <summary>FR-35: remove a blocked date; prevented when an active booking overlaps it.</summary>
    [HttpPost("/api/actions/cars/unblock-date")]
    public async Task<IActionResult> UnblockDate([FromBody] BlockedDateBody body)
    {
        var user = currentUser.RequireActiveUser();
        var car = await OwnCarAsync(body.CarId ?? "", user.Id);
        if (car == null) return Ok(new { error = "You can only manage your own listings." });
        var dateStr = body.Date ?? "";
        var day = DateTime.Parse(dateStr).Date;
        var actives = await db.Bookings
            .Where(b => b.CarId == car.Id && BookingRules.BlockingStatuses.Contains(b.Status))
            .ToListAsync();
        if (actives.Any(b => Pricing.RangesOverlap(day, day, b.StartDate, b.EndDate)))
            return Ok(new { error = "That date overlaps an active booking and cannot be unblocked." });

        car.UnavailableDates = car.UnavailableDates
            .Where(d => d.Date.ToString("yyyy-MM-dd") != dateStr)
            .ToList();
        car.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { ok = true, message = "Date unblocked." });
    }
}
