// ExportsController — the three CSV downloads (FR-27, FR-37, FR-44), ported
// cell-for-cell from the original export routes.
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Services;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class ExportsController(AppDbContext db, CurrentUser currentUser) : ControllerBase
{
    // GET /api/export/bookings — renter CSV (FR-27): own rows only, RFC-quoted.
    [HttpGet("/api/export/bookings")]
    public async Task<IActionResult> BookingsCsv([FromQuery] string? status)
    {
        var user = currentUser.User;
        if (user == null) return Unauthorized(new { error = "Unauthorized" });

        var allowed = Enum.GetNames<BookingStatus>().ToHashSet();
        var query = db.Bookings.Where(b => b.RenterId == user.Id).Include(b => b.Car).AsQueryable();
        if (!string.IsNullOrEmpty(status) && allowed.Contains(status.ToUpperInvariant()))
            query = query.Where(b => b.Status == Enum.Parse<BookingStatus>(status.ToUpperInvariant()));
        var rows = await query.OrderByDescending(b => b.StartDate).ToListAsync();

        var lines = new List<string[]>
        {
            new[] { "booking_id", "car", "start_date", "end_date", "days", "price_per_day_etb", "subtotal_etb", "fee_etb", "total_etb", "status", "payment_status", "payment_ref", "created_at" },
        };
        foreach (var b in rows)
        {
            lines.Add(new[]
            {
                b.Id, $"{b.Car.Make} {b.Car.Model} {b.Car.Year}", Pricing.ToIsoDate(b.StartDate), Pricing.ToIsoDate(b.EndDate),
                b.Days.ToString(), b.PricePerDay.ToString(), b.Subtotal.ToString(), b.Fee.ToString(), b.Total.ToString(),
                b.Status.ToString(), b.PaymentStatus.ToString(), b.PaymentRef ?? "", b.CreatedAt.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"),
            });
        }
        var csv = Csv.Build(lines);
        Response.Headers["Content-Disposition"] = $"attachment; filename=\"sheggar-wheels-bookings-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.csv\"";
        return Content(csv, "text/csv; charset=utf-8");
    }

    // GET /api/export/owner-earnings — owner CSV (FR-37).
    [HttpGet("/api/export/owner-earnings")]
    public async Task<IActionResult> OwnerEarningsCsv()
    {
        var user = currentUser.User;
        if (user == null || !user.Roles.Contains(Role.OWNER)) return Unauthorized(new { error = "Forbidden" });

        var done = new[] { BookingStatus.COMPLETED, BookingStatus.REVIEWED, BookingStatus.RESOLVED };
        var rows = await db.Bookings
            .Where(b => b.OwnerId == user.Id && done.Contains(b.Status))
            .OrderByDescending(b => b.StartDate)
            .Include(b => b.Car)
            .Include(b => b.Renter)
            .ToListAsync();

        // owner_income_etb = subtotal − discount + driverTotal (what the owner keeps —
        // the driver is the owner's); the 10% service fee on the OVERALL price (FR-49)
        // is platform income and is listed separately, never merged.
        var lines = new List<string[]>
        {
            new[] { "booking_id", "car", "renter", "drive_mode", "start_date", "end_date", "days", "driver_fee_etb", "owner_income_etb", "platform_fee_etb", "released", "status" },
        };
        foreach (var b in rows)
        {
            lines.Add(new[]
            {
                b.Id, $"{b.Car.Make} {b.Car.Model} {b.Car.Year}", b.Renter.Name, b.DriveMode.ToString(),
                Pricing.ToIsoDate(b.StartDate), Pricing.ToIsoDate(b.EndDate), b.Days.ToString(),
                b.DriverTotal.ToString(), (b.Subtotal - b.DiscountAmount + b.DriverTotal).ToString(), b.Fee.ToString(),
                b.PaymentStatus.ToString(), b.Status.ToString(),
            });
        }
        var csv = Csv.Build(lines);
        Response.Headers["Content-Disposition"] = $"attachment; filename=\"sheggar-wheels-earnings-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.csv\"";
        return Content(csv, "text/csv; charset=utf-8");
    }

    // GET /api/export/admin-report — server-generated CSV platform report (FR-44).
    [HttpGet("/api/export/admin-report")]
    public async Task<IActionResult> AdminReportCsv()
    {
        var user = currentUser.User;
        if (user == null || !user.Roles.Contains(Role.ADMIN)) return Unauthorized(new { error = "Forbidden" });

        var users = await db.Users
            .OrderBy(u => u.CreatedAt)
            .Include(u => u.RenterBookings)
            .Include(u => u.Cars)
            .ToListAsync();

        var lines = new List<string[]>
        {
            new[] { "user_id", "name", "email", "phone", "roles", "status", "bookings_as_renter", "cars_listed", "joined_at" },
        };
        foreach (var u in users)
        {
            lines.Add(new[]
            {
                u.Id, u.Name, u.Email, u.Phone ?? "", string.Join("|", u.Roles), u.Status.ToString(),
                u.RenterBookings.Count.ToString(), u.Cars.Count.ToString(), u.CreatedAt.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"),
            });
        }
        var csv = Csv.Build(lines);
        Response.Headers["Content-Disposition"] = $"attachment; filename=\"sheggar-wheels-report-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.csv\"";
        return Content(csv, "text/csv; charset=utf-8");
    }
}
