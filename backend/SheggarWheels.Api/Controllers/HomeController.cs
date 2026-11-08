// Root + health probe — ports of src/app/api/route.ts and /api/health.
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Data;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class HomeController(AppDbContext db, IConfiguration config) : ControllerBase
{
    // GET / — the same friendly payload the original root route returned.
    [HttpGet("/")]
    public IActionResult Root() => Ok(new { message = "Hello, world!" });

    // GET /api/health — 200 = DB reachable; 503 = degraded. No internals leaked.
    [HttpGet("/api/health")]
    public async Task<IActionResult> Health()
    {
        var startedAt = PerformanceCounter();
        var checks = new Dictionary<string, string> { ["database"] = "fail" };
        long? dbLatencyMs = null;
        try
        {
            var t0 = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            await db.Database.ExecuteSqlRawAsync("SELECT 1");
            dbLatencyMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - t0;
            checks["database"] = "ok";
        }
        catch
        {
            // Intentionally swallow details — health endpoints must not leak internals.
        }
        var ok = checks.Values.All(v => v == "ok");
        var payload = new
        {
            status = ok ? "ok" : "degraded",
            service = "Sheggar Wheels",
            version = config["SITE_VERSION"] ?? "1.0.0",
            checks,
            dbLatencyMs,
            uptimeSec = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - startedAt,
            timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"),
        };
        Response.Headers["Cache-Control"] = "no-store";
        return StatusCode(ok ? 200 : 503, payload);
    }

    private static long PerformanceCounter() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
