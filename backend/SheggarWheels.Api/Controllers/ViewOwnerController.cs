// ViewOwnerController — read models for the owner hub pages (FR-36..39).
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class ViewOwnerController(AppDbContext db, CurrentUser currentUser) : ControllerBase
{
    // GET /api/view/owner — owner overview (FR-36/37).
    [HttpGet("/api/view/owner")]
    public async Task<IActionResult> OwnerHub()
    {
        var user = currentUser.RequireActiveUser();
        var cars = await db.Cars.Where(c => c.OwnerId == user.Id).OrderByDescending(c => c.CreatedAt).ToListAsync();
        var requests = await db.Bookings
            .Where(b => b.OwnerId == user.Id && b.Status == BookingStatus.REQUESTED)
            .Include(b => b.Car)
            .Include(b => b.Renter)
            .OrderBy(b => b.CreatedAt)
            .ToListAsync();
        var confirmed = await db.Bookings
            .CountAsync(b => b.OwnerId == user.Id && (b.Status == BookingStatus.CONFIRMED || b.Status == BookingStatus.IN_PROGRESS));
        var released = await db.Bookings
            .Where(b => b.OwnerId == user.Id &&
                (b.Status == BookingStatus.COMPLETED || b.Status == BookingStatus.REVIEWED || b.Status == BookingStatus.RESOLVED))
            .SumAsync(b => (int?)b.Total) ?? 0;
        return Ok(new { cars, requests, confirmed, released });
    }

    // GET /api/view/owner/cars — owner listings list (FR-33) with booking counts.
    [HttpGet("/api/view/owner/cars")]
    public async Task<IActionResult> OwnerCars()
    {
        var user = currentUser.RequireActiveUser();
        var cars = await db.Cars
            .Where(c => c.OwnerId == user.Id)
            .OrderByDescending(c => c.CreatedAt)
            .Include(c => c.Bookings)
            .ToListAsync();
        return Ok(new
        {
            cars = cars.Select(c => new
            {
                Car = c,
                bookingsCount = c.Bookings.Count,
            }),
        });
    }

    // GET /api/view/owner/cars/{id} — own car (edit page + availability page data).
    [HttpGet("/api/view/owner/cars/{id}")]
    public async Task<IActionResult> OwnerCar(string id)
    {
        var user = currentUser.RequireActiveUser();
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == id);
        if (car == null || car.OwnerId != user.Id) return NotFound(new { error = "not_found" });
        return Ok(new { car });
    }

    // GET /api/view/owner/cars/{id}/bookings — per-car bookings (FR-36).
    [HttpGet("/api/view/owner/cars/{id}/bookings")]
    public async Task<IActionResult> OwnerCarBookings(string id)
    {
        var user = currentUser.RequireActiveUser();
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == id);
        if (car == null || car.OwnerId != user.Id) return NotFound(new { error = "not_found" });
        var bookings = await db.Bookings
            .Where(b => b.CarId == id)
            .OrderByDescending(b => b.CreatedAt)
            .Include(b => b.Renter)
            .ToListAsync();
        return Ok(new { car, bookings });
    }

    // GET /api/view/owner/earnings — raw rows; the page keeps its chart maths (FR-37).
    [HttpGet("/api/view/owner/earnings")]
    public async Task<IActionResult> OwnerEarnings()
    {
        var user = currentUser.RequireActiveUser();
        var bookings = await db.Bookings
            .Where(b => b.OwnerId == user.Id &&
                (b.Status == BookingStatus.COMPLETED || b.Status == BookingStatus.REVIEWED || b.Status == BookingStatus.RESOLVED))
            .Include(b => b.Car)
            .OrderBy(b => b.StartDate)
            .ToListAsync();
        var heldRows = await db.Bookings
            .CountAsync(b => b.OwnerId == user.Id && b.PaymentStatus == PaymentStatus.HELD);
        return Ok(new { bookings, heldRows });
    }

    // GET /api/view/owner/reviews — reviews of own cars (FR-31).
    [HttpGet("/api/view/owner/reviews")]
    public async Task<IActionResult> OwnerReviews()
    {
        var user = currentUser.RequireActiveUser();
        var reviews = await db.Reviews
            .Where(r => r.OwnerId == user.Id)
            .OrderByDescending(r => r.CreatedAt)
            .Include(r => r.Car)
            .Include(r => r.Renter)
            .ToListAsync();
        return Ok(new { reviews });
    }

    // GET /api/view/owner/disputes — disputes on own rentals (FR-39/43 view).
    [HttpGet("/api/view/owner/disputes")]
    public async Task<IActionResult> OwnerDisputes()
    {
        var user = currentUser.RequireActiveUser();
        var disputes = await db.Disputes
            .Where(d => d.Booking != null && d.Booking.OwnerId == user.Id)
            .OrderByDescending(d => d.CreatedAt)
            .Include(d => d.Booking).ThenInclude(b => b.Car)
            .Include(d => d.Booking).ThenInclude(b => b.Renter)
            .ToListAsync();
        return Ok(new { disputes });
    }
}
