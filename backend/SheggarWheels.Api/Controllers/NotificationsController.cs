// NotificationsController — the two BROWSER-called endpoints the notification
// bell talks to (GET /api/notifications/summary, POST /api/notifications/read-all).
// These keep their exact paths so the bell component needs zero changes.
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class NotificationsController(AppDbContext db, CurrentUser currentUser) : ControllerBase
{
    // GET /api/notifications/summary — the ONLY data source of the notification bell.
    // unread = badge number; recent = the 8 newest for the dropdown. 401 when signed out.
    [HttpGet("/api/notifications/summary")]
    public async Task<IActionResult> Summary()
    {
        var user = currentUser.User;
        if (user == null) return Unauthorized(new { error = "Unauthorized" });

        var unread = await db.Notifications.CountAsync(n => n.UserId == user.Id && !n.Read);
        var recent = await db.Notifications
            .Where(n => n.UserId == user.Id)
            .OrderByDescending(n => n.CreatedAt)
            .Take(8)
            .Select(n => new { n.Id, n.Title, n.Body, n.Link, n.Read })
            .ToListAsync();
        return Ok(new { unread, recent });
    }

    // POST /api/notifications/read-all — mark every unseen row as seen.
    [HttpPost("/api/notifications/read-all")]
    public async Task<IActionResult> ReadAll()
    {
        var user = currentUser.User;
        if (user == null) return Unauthorized(new { error = "Unauthorized" });
        await db.Notifications
            .Where(n => n.UserId == user.Id && !n.Read)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.Read, true));
        return Ok(new { ok = true });
    }
}
