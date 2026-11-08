// ViewAdminController — read models for the admin console pages (FR-40..44).
// NOTE: these replicate the ORIGINAL guard behaviour (any signed-in active user
// may call them; role checks live on the mutating actions) — fidelity first.
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class ViewAdminController(AppDbContext db, CurrentUser currentUser) : ControllerBase
{
    // GET /api/view/admin — platform metrics tiles (FR-40/44).
    [HttpGet("/api/view/admin")]
    public async Task<IActionResult> AdminConsole()
    {
        currentUser.RequireActiveUser();
        var pendingCars = await db.Cars.CountAsync(c => c.Status == CarStatus.PENDING);
        var totalCars = await db.Cars.CountAsync();
        var users = await db.Users.CountAsync();
        var openDisputes = await db.Disputes.CountAsync(d => d.Status == DisputeStatus.OPEN);
        var bookings = await db.Bookings.CountAsync();
        var gmv = await db.Bookings
            .Where(b => b.Status == BookingStatus.COMPLETED || b.Status == BookingStatus.REVIEWED || b.Status == BookingStatus.RESOLVED)
            .SumAsync(b => (int?)b.Total) ?? 0;
        var heldRows = await db.Bookings.Where(b => b.PaymentStatus == PaymentStatus.HELD).ToListAsync();
        var platformIncome = await db.Bookings
            .Where(b => b.PaymentStatus == PaymentStatus.PAID)
            .SumAsync(b => (int?)b.Fee) ?? 0;
        return Ok(new
        {
            pendingCars, totalCars, users, openDisputes, bookings, gmv,
            heldCount = heldRows.Count,
            heldTotal = heldRows.Sum(b => b.Total),
            platformIncome,
        });
    }

    // GET /api/view/admin/users — user management table (FR-41, BR-10).
    [HttpGet("/api/view/admin/users")]
    public async Task<IActionResult> Users()
    {
        currentUser.RequireActiveUser();
        var users = await db.Users
            .OrderBy(u => u.CreatedAt)
            .Include(u => u.RenterBookings)
            .Include(u => u.Cars)
            .ToListAsync();
        return Ok(new
        {
            users = users.Select(u => new
            {
                User = u,
                renterBookingsCount = u.RenterBookings.Count,
                carsCount = u.Cars.Count,
            }),
        });
    }

    // GET /api/view/admin/users/{id} — single user detail (FR-41).
    [HttpGet("/api/view/admin/users/{id}")]
    public async Task<IActionResult> UserDetail(string id)
    {
        var admin = currentUser.RequireActiveUser();
        var user = await db.Users
            .Include(u => u.RenterBookings.OrderByDescending(b => b.CreatedAt).Take(6)).ThenInclude(b => b.Car)
            .Include(u => u.Cars)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { error = "not_found" });
        return Ok(new { admin, user });
    }

    // GET /api/view/admin/listings — listing moderation (FR-40, BR-02, FR-47).
    [HttpGet("/api/view/admin/listings")]
    public async Task<IActionResult> Listings()
    {
        currentUser.RequireActiveUser();
        var cars = await db.Cars
            .OrderBy(c => c.Status).ThenByDescending(c => c.CreatedAt)
            .Include(c => c.Owner)
            .Include(c => c.Bookings)
            .ToListAsync();
        return Ok(new
        {
            cars = cars.Select(c => new { Car = c, ownerName = c.Owner.Name, bookingsCount = c.Bookings.Count }),
        });
    }

    // GET /api/view/admin/bookings — all bookings (FR-42) with filters.
    [HttpGet("/api/view/admin/bookings")]
    public async Task<IActionResult> AdminBookings([FromQuery] string? status, [FromQuery] string? from, [FromQuery] string? to, [FromQuery] string? payment)
    {
        currentUser.RequireActiveUser();
        var known = Enum.GetNames<BookingStatus>().Select(s => s).ToHashSet();
        var query = db.Bookings.AsQueryable();
        if (!string.IsNullOrEmpty(status) && known.Contains(status))
            query = query.Where(b => b.Status == Enum.Parse<BookingStatus>(status));
        if (!string.IsNullOrEmpty(from) && DateTime.TryParse(from, out var f))
            query = query.Where(b => b.StartDate >= f.Date);
        if (!string.IsNullOrEmpty(to) && DateTime.TryParse(to, out var t))
            query = query.Where(b => b.EndDate <= t.Date.AddDays(1).AddMilliseconds(-1));
        if (payment == "held")
            query = query.Where(b => b.PaymentStatus == PaymentStatus.HELD);
        var bookings = await query
            .OrderByDescending(b => b.CreatedAt)
            .Include(b => b.Car)
            .Include(b => b.Renter)
            .Include(b => b.Owner)
            .ToListAsync();
        return Ok(new { bookings });
    }

    // GET /api/view/admin/disputes — dispute queue (FR-43, BR-07).
    [HttpGet("/api/view/admin/disputes")]
    public async Task<IActionResult> Disputes()
    {
        currentUser.RequireActiveUser();
        var disputes = await db.Disputes
            .OrderBy(d => d.Status).ThenByDescending(d => d.CreatedAt)
            .Include(d => d.Booking).ThenInclude(b => b.Car)
            .Include(d => d.Booking).ThenInclude(b => b.Renter)
            .Include(d => d.Booking).ThenInclude(b => b.Owner)
            .Include(d => d.OpenedBy)
            .ToListAsync();
        return Ok(new { disputes });
    }

    // GET /api/view/admin/disputes/{id} — dispute detail + resolve form data.
    [HttpGet("/api/view/admin/disputes/{id}")]
    public async Task<IActionResult> DisputeDetail(string id)
    {
        currentUser.RequireActiveUser();
        var dispute = await db.Disputes
            .Where(d => d.Id == id)
            .Include(d => d.Booking).ThenInclude(b => b.Car)
            .Include(d => d.Booking).ThenInclude(b => b.Renter)
            .Include(d => d.Booking).ThenInclude(b => b.Owner)
            .Include(d => d.OpenedBy)
            .Include(d => d.ResolvedBy)
            .FirstOrDefaultAsync();
        if (dispute == null) return NotFound(new { error = "not_found" });
        return Ok(new { dispute });
    }

    // GET /api/view/admin/announcements — create + toggle list (FR-44).
    [HttpGet("/api/view/admin/announcements")]
    public async Task<IActionResult> Announcements()
    {
        currentUser.RequireActiveUser();
        var announcements = await db.Announcements
            .OrderByDescending(a => a.CreatedAt)
            .Include(a => a.CreatedBy)
            .Include(a => a.Car)
            .ToListAsync();
        return Ok(new { announcements });
    }

    // GET /api/view/admin/earnings — raw rows for the income dashboard (FR-44);
    // the page keeps its month-window / per-owner aggregation logic.
    [HttpGet("/api/view/admin/earnings")]
    public async Task<IActionResult> AdminEarnings()
    {
        currentUser.RequireActiveUser();
        var released = await db.Bookings
            .Where(b => b.PaymentStatus == PaymentStatus.PAID)
            .Select(b => new
            {
                b.Subtotal, b.DiscountAmount, b.DriverTotal, b.Fee, b.EndDate,
                ownerId = b.Owner.Id, ownerName = b.Owner.Name,
            })
            .ToListAsync();
        var held = await db.Bookings
            .Where(b => b.PaymentStatus == PaymentStatus.HELD)
            .Select(b => b.Total)
            .ToListAsync();
        return Ok(new { released, held, heldCount = held.Count });
    }

    // GET /api/view/admin/reports — platform report metrics (FR-44).
    [HttpGet("/api/view/admin/reports")]
    public async Task<IActionResult> Reports()
    {
        currentUser.RequireActiveUser();
        var users = await db.Users.CountAsync();
        var cars = await db.Cars.CountAsync();
        var pending = await db.Cars.CountAsync(c => c.Status == CarStatus.PENDING);
        var bookings = await db.Bookings.CountAsync();
        var byStatus = await db.Bookings
            .GroupBy(b => b.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();
        var completed = await db.Bookings
            .Where(b => b.Status == BookingStatus.COMPLETED || b.Status == BookingStatus.REVIEWED || b.Status == BookingStatus.RESOLVED)
            .Select(b => new { b.Subtotal, b.Fee, b.Total })
            .ToListAsync();
        var activeStatuses = new[] { BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.REVIEWED, BookingStatus.RESOLVED };
        var utilised = await db.Cars.CountAsync(c => c.Bookings.Any(b => activeStatuses.Contains(b.Status)));
        return Ok(new { users, cars, pending, bookings, byStatus, completed, utilised });
    }
}
