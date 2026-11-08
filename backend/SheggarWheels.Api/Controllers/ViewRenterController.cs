// ViewRenterController — read models for the signed-in renter pages:
// dashboard, bookings list/detail, checkout, notifications page, profile.
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class ViewRenterController(AppDbContext db, CurrentUser currentUser) : ControllerBase
{
    // GET /api/view/dashboard — renter dashboard (FR-26).
    [HttpGet("/api/view/dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var user = currentUser.RequireActiveUser();
        var bookings = await db.Bookings
            .Where(b => b.RenterId == user.Id)
            .Include(b => b.Car)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
        var announcement = await db.Announcements
            .Where(a => a.Active)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();
        return Ok(new { user, bookings, announcement });
    }

    // GET /api/view/bookings — renter bookings list (FR-26..28) with filters.
    [HttpGet("/api/view/bookings")]
    public async Task<IActionResult> Bookings([FromQuery] string? status, [FromQuery] string? from, [FromQuery] string? to)
    {
        var user = currentUser.RequireActiveUser();

        var statuses = status switch
        {
            "upcoming" => new[] { BookingStatus.REQUESTED, BookingStatus.CONFIRMED },
            "active" => new[] { BookingStatus.IN_PROGRESS },
            "past" => new[] { BookingStatus.COMPLETED, BookingStatus.REVIEWED, BookingStatus.RESOLVED },
            "cancelled" => new[] { BookingStatus.CANCELLED, BookingStatus.DECLINED },
            "disputed" => new[] { BookingStatus.DISPUTED },
            _ => null,
        };

        var query = db.Bookings.Where(b => b.RenterId == user.Id);
        if (statuses != null) query = query.Where(b => statuses.Contains(b.Status));
        if (!string.IsNullOrEmpty(from) && DateTime.TryParse(from, out var f))
            query = query.Where(b => b.StartDate >= f.Date);
        if (!string.IsNullOrEmpty(to) && DateTime.TryParse(to, out var t))
            query = query.Where(b => b.EndDate <= t.Date.AddDays(1).AddMilliseconds(-1));

        var bookings = await query
            .Include(b => b.Car)
            .OrderByDescending(b => b.StartDate)
            .ToListAsync();

        var next = await db.Bookings
            .Where(b => b.RenterId == user.Id &&
                (b.Status == BookingStatus.CONFIRMED || b.Status == BookingStatus.REQUESTED || b.Status == BookingStatus.IN_PROGRESS) &&
                b.StartDate >= DateTime.UtcNow)
            .OrderBy(b => b.StartDate)
            .Include(b => b.Car)
            .FirstOrDefaultAsync();

        var totalSpend = await db.Bookings
            .Where(b => b.RenterId == user.Id &&
                (b.Status == BookingStatus.COMPLETED || b.Status == BookingStatus.REVIEWED || b.Status == BookingStatus.RESOLVED))
            .SumAsync(b => (int?)b.Total) ?? 0;

        return Ok(new { bookings, next, totalSpend });
    }

    // GET /api/view/bookings/{id} — booking detail (FR-28): 404 unless
    // renter, owner, or admin — exactly like the original page.
    [HttpGet("/api/view/bookings/{id}")]
    public async Task<IActionResult> BookingDetail(string id)
    {
        var user = currentUser.RequireActiveUser();
        var booking = await db.Bookings
            .Include(b => b.Car)
            .Include(b => b.Renter)
            .Include(b => b.Owner)
            .Include(b => b.Review)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound(new { error = "not_found" });
        var isRenter = booking.RenterId == user.Id;
        var isOwner = booking.OwnerId == user.Id;
        if (!isRenter && !isOwner && !user.Roles.Contains(Role.ADMIN))
            return NotFound(new { error = "not_found" });
        var dispute = await db.Disputes
            .Where(d => d.BookingId == id)
            .OrderByDescending(d => d.CreatedAt)
            .FirstOrDefaultAsync();
        return Ok(new { user, booking, dispute, isRenter, isOwner });
    }

    // GET /api/view/checkout/{bookingId} — checkout page data (FR-23/24).
    [HttpGet("/api/view/checkout/{bookingId}")]
    public async Task<IActionResult> Checkout(string bookingId)
    {
        var user = currentUser.RequireActiveUser();
        var booking = await db.Bookings.Include(b => b.Car).FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null || booking.RenterId != user.Id) return NotFound(new { error = "not_found" });
        return Ok(new { user, booking });
    }

    // GET /api/view/notifications — the full notifications page list (FR-46).
    [HttpGet("/api/view/notifications")]
    public async Task<IActionResult> NotificationsPage()
    {
        var user = currentUser.RequireActiveUser();
        var items = await db.Notifications
            .Where(n => n.UserId == user.Id)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();
        return Ok(new { items });
    }

    // GET /api/view/profile — account summary (FR-50 page).
    [HttpGet("/api/view/profile")]
    public async Task<IActionResult> Profile()
    {
        var session = currentUser.RequireActiveUser();
        var user = await db.Users
            .Where(u => u.Id == session.Id)
            .Select(u => new { u.Name, u.Email, u.Phone, u.Roles })
            .FirstOrDefaultAsync();
        if (user == null) return NotFound(new { error = "not_found" });
        return Ok(new { user });
    }
}
