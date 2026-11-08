// Pricing and date rules (SRS FR-18, BR-03, BR-04) — pure functions, ported 1:1
// from src/lib/pricing.ts so the C# snapshot maths produces identical numbers.
namespace SheggarWheels.Api.Services;

public static class Pricing
{
    public const double PlatformFeeRate = 0.1; // BR-04: demo platform fee
    private const long MsPerDay = 86_400_000;

    public static int DaysInclusive(DateTime start, DateTime end) =>
        (int)Math.Round((end.Ticks - start.Ticks) / (double)TimeSpan.TicksPerMillisecond / MsPerDay) + 1;

    public sealed record Totals(
        int Days, int Subtotal, int DiscountPercent, int DiscountAmount,
        int DriverFeePerDay, int DriverTotal, int Fee, int Total);

    /// <summary>Snapshot maths (BR-03/BR-04) with an optional discount percent and an
    /// optional owner-driver daily fee (FR-49). Returns null for an invalid range.</summary>
    public static Totals? ComputeTotals(int pricePerDay, DateTime start, DateTime end, int discountPercent = 0, int driverFeePerDay = 0)
    {
        if (end < start) return null;
        var days = DaysInclusive(start, end);
        var subtotal = pricePerDay * days;
        // Sanitise here so every caller inherits safe maths: negative percent → 0, never above 100.
        var pct = discountPercent > 0 ? Math.Min(discountPercent, 100) : 0;
        var discountAmount = (int)Math.Round(subtotal * (double)pct / 100, MidpointRounding.ToEven);
        var driver = driverFeePerDay > 0 ? driverFeePerDay : 0;
        var driverTotal = driver * days;
        var discounted = subtotal - discountAmount;
        // FR-49: the 10% platform fee applies to the OVERALL booking price — car (post-discount) + owner driver fee.
        var fee = (int)Math.Round((discounted + driverTotal) * PlatformFeeRate, MidpointRounding.ToEven);
        return new Totals(days, subtotal, pct, discountAmount, driver, driverTotal, fee, discounted + driverTotal + fee);
    }

    public static string ToIsoDate(DateTime d) => d.ToUniversalTime().ToString("yyyy-MM-dd");

    public static DateTime FromIsoDate(string iso) =>
        DateTime.SpecifyKind(DateTime.Parse(iso).Date, DateTimeKind.Unspecified);

    public static string TodayIso() => ToIsoDate(DateTime.UtcNow);

    /// <summary>BR-05: inclusive range overlap.</summary>
    public static bool RangesOverlap(DateTime s1, DateTime e1, DateTime s2, DateTime e2) =>
        s1 <= e2 && s2 <= e1;

    /// <summary>True when [start,end] intersects any of the blocked dates (FR-14/FR-35).</summary>
    public static bool HitsBlockedDates(DateTime start, DateTime end, IEnumerable<DateTime> blocked) =>
        blocked.Any(b => start <= b.Date && b.Date <= end);
}
