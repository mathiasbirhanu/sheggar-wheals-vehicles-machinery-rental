// SeedController — replaces `npx prisma db push` + `npx prisma db seed` for the
// C# stack. POST /api/dev/seed with header X-Seed-Token matching the SEED_TOKEN
// env var (any call allowed in Development). Clears and re-creates the demo data.
using Microsoft.AspNetCore.Mvc;
using SheggarWheels.Api.Services;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class SeedController(SeedService seed, IConfiguration config, IHostEnvironment env) : ControllerBase
{
    [HttpPost("/api/dev/seed")]
    public async Task<IActionResult> Seed()
    {
        var expected = config["SEED_TOKEN"];
        var provided = Request.Headers["x-seed-token"].FirstOrDefault();
        var devOpen = env.IsDevelopment();
        if (!devOpen && (string.IsNullOrEmpty(expected) || provided != expected))
            return Unauthorized(new { error = "Provide the X-Seed-Token header matching SEED_TOKEN." });
        var result = await seed.SeedAsync();
        return Ok(new { ok = true, result });
    }
}
