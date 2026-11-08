// ViewPublicController — read models for the public pages (home, browse, car
// detail, sign-in, sitemap). Endpoints return the SAME entity shapes the
// Prisma-backed server components consumed, so the page code keeps its logic.
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Services;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class ViewPublicController(AppDbContext db, CurrentUser currentUser, GoogleOAuth google) : ControllerBase
{
    // GET /api/view/home — everything the landing page renders.
    [HttpGet("/api/view/home")]
    public async Task<IActionResult> Home()
    {
        var now = DateTime.UtcNow;
        var featured = await db.Cars
            .Where(c => c.Status == CarStatus.APPROVED)
            .OrderBy(c => c.CreatedAt)
            .Take(6)
            .Include(c => c.Reviews)   // the page reads only r.rating from these
            .Include(c => c.Owner)
            .ToListAsync();

        var tickerItems = await db.Announcements
            .Where(a => a.Active && (a.ValidUntil == null || a.ValidUntil >= now))
            .OrderByDescending(a => a.CreatedAt)
            .Take(8)
            .Select(a => new { a.Id, a.Title, a.Kind, a.DiscountPercent, a.ValidUntil })
            .ToListAsync();

        var offers = await db.Announcements
            .Where(a => a.Active && a.Kind == AnnouncementKind.DISCOUNT && (a.ValidUntil == null || a.ValidUntil >= now))
            .OrderByDescending(a => a.DiscountPercent)
            .Select(a => new { a.Id, a.Title, a.Body, a.DiscountPercent, a.ValidUntil, a.CarId })
            .ToListAsync();

        var approvedCount = await db.Cars.CountAsync(c => c.Status == CarStatus.APPROVED);
        var neighbourhoods = await db.Cars
            .Where(c => c.Status == CarStatus.APPROVED)
            .Select(c => c.Neighbourhood)
            .Distinct()
            .ToListAsync();
        var completedTrips = await db.Bookings
            .CountAsync(b => b.Status == BookingStatus.COMPLETED || b.Status == BookingStatus.REVIEWED || b.Status == BookingStatus.RESOLVED);
        var discountMap = await BookingRules.GetActiveDiscountMapAsync(db, featured.Select(c => c.Id).ToList());

        return Ok(new
        {
            featured,
            tickerItems,
            offers,
            approvedCount,
            neighbourhoods,
            completedTrips,
            discountMap,
        });
    }

    // GET /api/view/cars — the catalogue query (FR-08..12): search + filters + sort
    // + availability + pagination, all mirrored in URL params. Ported 1:1.
    [HttpGet("/api/view/cars")]
    public async Task<IActionResult> Cars(
        [FromQuery] string? q, [FromQuery] string? neighbourhood, [FromQuery] string? transmission,
        [FromQuery] string? fuelType, [FromQuery] string? seats, [FromQuery] string? minPrice,
        [FromQuery] string? maxPrice, [FromQuery] string? start, [FromQuery] string? end,
        [FromQuery] string? sort, [FromQuery] string? page)
    {
        const int PageSize = 6;
        var pageN = Math.Max(1, int.TryParse(page, out var p) ? p : 1);

        var query = db.Cars
            .Where(c => c.Status == CarStatus.APPROVED)
            .Include(c => c.Owner)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = $"%{q.Trim()}%";
            query = query.Where(c =>
                EF.Functions.ILike(c.Make, pattern) ||
                EF.Functions.ILike(c.Model, pattern) ||
                EF.Functions.ILike(c.Description, pattern) ||
                EF.Functions.ILike(c.Neighbourhood, pattern));
        }
        if (!string.IsNullOrWhiteSpace(neighbourhood))
            query = query.Where(c => EF.Functions.ILike(c.Neighbourhood, $"%{neighbourhood.Trim()}%"));
        if (transmission is "AUTOMATIC" or "MANUAL")
            query = query.Where(c => c.Transmission == Enum.Parse<Transmission>(transmission));
        if (fuelType is "PETROL" or "DIESEL" or "HYBRID" or "ELECTRIC")
            query = query.Where(c => c.FuelType == Enum.Parse<FuelType>(fuelType));
        if (seats is "2" or "4" or "5" or "7")
            query = query.Where(c => c.Seats >= int.Parse(seats));
        if (int.TryParse(minPrice, out var min) && min > 0)
            query = query.Where(c => c.PricePerDay >= min);
        if (int.TryParse(maxPrice, out var max) && max > 0)
            query = query.Where(c => c.PricePerDay <= max);

        query = sort switch
        {
            "price-asc" => query.OrderBy(c => c.PricePerDay),
            "price-desc" => query.OrderByDescending(c => c.PricePerDay),
            "popular" => query.OrderByDescending(c => c.Bookings.Count),
            _ => query.OrderByDescending(c => c.CreatedAt),
        };

        var all = await query.ToListAsync();

        // Load the two relations the original page included: review ratings (for the
        // card stars) and the blocking bookings (for the availability filter).
        var ids = all.Select(c => c.Id).ToList();
        var ratingsByCar = await db.Reviews.Where(r => ids.Contains(r.CarId)).Select(r => new { r.CarId, r.Rating }).ToListAsync();
        var blockingBookings = await db.Bookings
            .Where(b => ids.Contains(b.CarId) && BookingRules.BlockingStatuses.Contains(b.Status))
            .Select(b => new { b.CarId, b.StartDate, b.EndDate })
            .ToListAsync();

        // FR-09 availability filter: drop cars blocked in the requested range.
        IEnumerable<Entities.Car> results = all;
        if (!string.IsNullOrEmpty(start) && !string.IsNullOrEmpty(end) &&
            DateTime.TryParse(start, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal, out var s) &&
            DateTime.TryParse(end, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal, out var e) && e >= s)
        {
            results = results.Where(car =>
            {
                var blocked = car.UnavailableDates.Any(b => { var d = b.Date; return s <= d && d <= e; });
                if (blocked) return false;
                var booked = blockingBookings.Any(bk => bk.CarId == car.Id && s <= bk.EndDate && bk.StartDate <= e);
                return !booked;
            });
        }

        var resultList = results.ToList();
        var total = resultList.Count;
        var pages = Math.Max(1, (int)Math.Ceiling(total / (double)PageSize));
        var clamped = Math.Min(pageN, pages);
        var slice = resultList.Skip((clamped - 1) * PageSize).Take(PageSize).ToList();

        // ONE extra query for the whole page of cards (anti-N+1): carId -> live percent.
        var discountMap = await BookingRules.GetActiveDiscountMapAsync(db, slice.Select(c => c.Id).ToList());

        // Map search data: slim objects for ALL filtered cars (not just this page), capped.
        var mapCars = resultList.Take(200).Select(c => new
        {
            c.Id, c.Make, c.Model, c.Year, c.PricePerDay, c.Neighbourhood, c.Lat, c.Lng,
            photo = c.Photos.FirstOrDefault(),
        }).ToList();

        var neighbourhoods = await db.Cars
            .Where(c => c.Status == CarStatus.APPROVED)
            .Select(c => c.Neighbourhood)
            .Distinct()
            .ToListAsync();

        return Ok(new
        {
            total,
            pages,
            page = clamped,
            slice = slice.Select(c => new
            {
                Car = c,
                ratings = ratingsByCar.Where(r => r.CarId == c.Id).Select(r => r.Rating).ToList(),
            }),
            mapCars,
            neighbourhoods = neighbourhoods.Order().ToList(),
            discountMap,
        });
    }

    // GET /api/view/cars/{id} — car detail page data (FR-13..16).
    [HttpGet("/api/view/cars/{id}")]
    public async Task<IActionResult> CarDetail(string id)
    {
        var car = await db.Cars
            .Include(c => c.Owner)
            .Include(c => c.Reviews.OrderByDescending(r => r.CreatedAt)).ThenInclude(r => r.Renter)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (car == null) return NotFound(new { error = "not_found" });

        var user = currentUser.User;
        var isPublic = car.Status == CarStatus.APPROVED;
        var isOwner = user?.Id == car.OwnerId;
        if (!isPublic && !isOwner) return NotFound(new { error = "not_found" });

        var blocking = await db.Bookings
            .Where(b => b.CarId == id && BookingRules.BlockingStatuses.Contains(b.Status))
            .Select(b => new { b.StartDate, b.EndDate, b.Status })
            .ToListAsync();

        var discountPercent = isPublic ? await BookingRules.GetActiveCarDiscountAsync(db, id) : 0;

        // Pre-computed for the page: blocked ISO dates + held ranges (from/to ISO strings).
        var bookedRanges = blocking.Select(b => new
        {
            from = b.StartDate.ToString("yyyy-MM-dd"),
            to = b.EndDate.ToString("yyyy-MM-dd"),
            status = b.Status.ToString(),
        }).ToList();

        return Ok(new { car, bookedRanges, discountPercent, isPublic, isOwner });
    }

    // GET /api/view/cars/{id}/meta — the lightweight SEO payload for generateMetadata.
    [HttpGet("/api/view/cars/{id}/meta")]
    public async Task<IActionResult> CarMeta(string id)
    {
        var car = await db.Cars
            .Where(c => c.Id == id)
            .Select(c => new { c.Make, c.Model, c.Year, c.Neighbourhood, c.City, c.PricePerDay, c.Photos, c.Status })
            .FirstOrDefaultAsync();
        if (car == null) return NotFound(new { error = "not_found" });
        return Ok(new { car });
    }

    // GET /api/view/signin — demo account chips + Google feature flag.
    [HttpGet("/api/view/signin")]
    public async Task<IActionResult> SignInView()
    {
        var accounts = await db.Users
            .Where(u => u.Status == UserStatus.ACTIVE && u.PasswordHash != null && u.Email.EndsWith("@sheggarwheels.et"))
            .OrderBy(u => u.Name)
            .Take(8)
            .Select(u => new { u.Email, u.Name, u.Roles })
            .ToListAsync();
        return Ok(new { accounts, googleEnabled = google.IsEnabled });
    }

    // GET /api/view/sitemap-cars — approved listing ids for the sitemap.
    [HttpGet("/api/view/sitemap-cars")]
    public async Task<IActionResult> SitemapCars()
    {
        var cars = await db.Cars
            .Where(c => c.Status == CarStatus.APPROVED)
            .OrderByDescending(c => c.UpdatedAt)
            .Take(500)
            .Select(c => new { c.Id, c.UpdatedAt })
            .ToListAsync();
        return Ok(new { cars });
    }
}
