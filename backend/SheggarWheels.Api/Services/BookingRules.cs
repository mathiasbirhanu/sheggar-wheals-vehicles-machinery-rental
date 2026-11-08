// Booking lifecycle guards (SRS Chapter 6, BR-05, FR-19/20/35) — port of
// src/lib/bookings.ts (the server-side parts; the pure transitions also live
// in the frontend as a mirror for rendering).
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;

namespace SheggarWheels.Api.Services;

public static class BookingRules
{
    /// <summary>States that hold the car's calendar (BR-05).</summary>
    public static readonly BookingStatus[] BlockingStatuses =
        [BookingStatus.REQUESTED, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.DISPUTED];

    /// <summary>Statuses that hard-hold the calendar at approval time.</summary>
    public static readonly BookingStatus[] HardHoldStatuses =
        [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.DISPUTED];

    /// <summary>Permitted transitions (SRS Chapter 6 finite state machine).</summary>
    public static readonly Dictionary<BookingStatus, BookingStatus[]> Transitions = new()
    {
        [BookingStatus.REQUESTED] = [BookingStatus.CONFIRMED, BookingStatus.DECLINED, BookingStatus.CANCELLED],
        [BookingStatus.CONFIRMED] = [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.DISPUTED],
        [BookingStatus.IN_PROGRESS] = [BookingStatus.COMPLETED, BookingStatus.DISPUTED],
        [BookingStatus.COMPLETED] = [BookingStatus.REVIEWED, BookingStatus.DISPUTED],
        [BookingStatus.REVIEWED] = [],
        [BookingStatus.DECLINED] = [],
        [BookingStatus.CANCELLED] = [],
        [BookingStatus.DISPUTED] = [BookingStatus.RESOLVED],
        [BookingStatus.RESOLVED] = [BookingStatus.COMPLETED], // restore after dispute resolution
    };

    public static bool CanTransition(BookingStatus from, BookingStatus to) =>
        Transitions.TryGetValue(from, out var list) && list.Contains(to);

    public static void AssertTransition(BookingStatus from, BookingStatus to)
    {
        if (!CanTransition(from, to))
            throw new LifecycleException($"Cannot move a {from.ToString().ToLowerInvariant()} booking to {to.ToString().ToLowerInvariant()}.");
    }

    /// <summary>BR-05 overlap check: returns a conflicting booking for the car intersecting
    /// [start,end] among the given statuses, or null. Excludes the booking being mutated.</summary>
    public static async Task<Booking?> FindConflictAsync(AppDbContext db, string carId, DateTime start, DateTime end, string? excludeId = null, BookingStatus[]? statuses = null)
    {
        var st = statuses ?? BlockingStatuses;
        var query = db.Bookings.Where(b => b.CarId == carId && st.Contains(b.Status));
        if (excludeId != null) query = query.Where(b => b.Id != excludeId);
        var actives = await query.ToListAsync();
        return actives.FirstOrDefault(b => Pricing.RangesOverlap(start, end, b.StartDate, b.EndDate));
    }

    /// <summary>Live discount for ONE car (badge + voucher maths). Rules: kind=DISCOUNT,
    /// admin-approved (active), not expired, targeting this car. If several are live,
    /// the renter gets the highest — one deterministic winner.</summary>
    public static async Task<int> GetActiveCarDiscountAsync(AppDbContext db, string carId)
    {
        var now = DateTime.UtcNow;
        var offer = await db.Announcements
            .Where(a => a.CarId == carId && a.Kind == AnnouncementKind.DISCOUNT && a.Active && (a.ValidUntil == null || a.ValidUntil >= now))
            .OrderByDescending(a => a.DiscountPercent)
            .Select(a => (int?)a.DiscountPercent)
            .FirstOrDefaultAsync();
        return offer ?? 0;
    }

    /// <summary>Batch version for card grids: ONE query answers "which of these N cars has a
    /// live discount?" — the anti-N+1 pattern. First seen per car (sorted desc) wins.</summary>
    public static async Task<Dictionary<string, int>> GetActiveDiscountMapAsync(AppDbContext db, IReadOnlyCollection<string> carIds)
    {
        var map = new Dictionary<string, int>();
        if (carIds.Count == 0) return map;
        var now = DateTime.UtcNow;
        var offers = await db.Announcements
            .Where(a => a.CarId != null && carIds.Contains(a.CarId) && a.Kind == AnnouncementKind.DISCOUNT && a.Active && (a.ValidUntil == null || a.ValidUntil >= now))
            .OrderByDescending(a => a.DiscountPercent)
            .Select(a => new { a.CarId, a.DiscountPercent })
            .ToListAsync();
        foreach (var o in offers)
            if (o.CarId != null && !map.ContainsKey(o.CarId))
                map[o.CarId] = o.DiscountPercent ?? 0;
        return map;
    }

    public sealed record NewBookingResult(string? Error, Car? Car, Pricing.Totals? Totals)
    {
        public bool Ok => Error == null;
    }

    /// <summary>Full request-time validation for a new booking on an approved+active car.
    /// Returns the SAME error strings as the original src/lib/bookings.ts.</summary>
    public static async Task<NewBookingResult> ValidateNewBookingAsync(AppDbContext db, string carId, DateTime start, DateTime end, string? excludeId = null, int driverFeePerDay = 0)
    {
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == carId);
        if (car == null || car.Status != CarStatus.APPROVED)
            return new("This car is not available for booking.", null, null);
        var discountPercent = await GetActiveCarDiscountAsync(db, carId);
        var totals = Pricing.ComputeTotals(car.PricePerDay, start, end, discountPercent, driverFeePerDay);
        if (totals == null)
            return new("The selected dates are not a valid range.", null, null);
        var future = DateTime.SpecifyKind(DateTime.Parse(Pricing.TodayIso()).Date, DateTimeKind.Unspecified);
        if (end < future)
            return new("The return date cannot be in the past.", null, null);
        if (Pricing.HitsBlockedDates(start, end, car.UnavailableDates))
            return new("The owner has blocked some of the selected dates. Please choose another range.", null, null);
        var conflict = await FindConflictAsync(db, carId, start, end, excludeId);
        if (conflict != null)
            return new("Those dates overlap another active booking for this car (BR-05).", null, null);
        return new(null, car, totals);
    }

    /// <summary>Generates the demo payment reference (FR-24): SW-DEMO-<PREFIX>-XXXX.</summary>
    public static string DemoPaymentRef(string? prefix = null)
    {
        const string chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        var rand = new string(Enumerable.Range(0, 4).Select(_ => chars[Random.Shared.Next(chars.Length)]).ToArray()).ToUpperInvariant();
        return prefix != null ? $"SW-DEMO-{prefix}-{rand}" : $"SW-DEMO-{rand}";
    }
}

public class LifecycleException(string message) : Exception(message);
