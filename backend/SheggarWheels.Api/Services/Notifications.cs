// In-app notifications (FR-44..46) — port of src/lib/notifications.ts.
// Fire-and-forget helpers: a failing notification NEVER breaks the primary
// mutation (FR-46 graceful degradation).
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Infrastructure;

namespace SheggarWheels.Api.Services;

public class Notifications(AppDbContext db)
{
    public async Task NotifyAsync(string userId, string title, string body, string? link = null)
    {
        try
        {
            db.Notifications.Add(new Notification { Id = Cuid.New(), UserId = userId, Title = title, Body = body, Link = link, CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }
        catch
        {
            // ignore — notifications must never break the primary mutation
        }
    }

    public async Task NotifyAdminsAsync(string title, string body, string? link = null)
    {
        try
        {
            var admins = await db.Users.Where(u => u.Roles.Contains(Role.ADMIN) && u.Status == UserStatus.ACTIVE).Select(u => u.Id).ToListAsync();
            if (admins.Count == 0) return;
            foreach (var id in admins)
                db.Notifications.Add(new Notification { Id = Cuid.New(), UserId = id, Title = title, Body = body, Link = link, CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }
        catch
        {
            // ignore
        }
    }

    /// <summary>Fan-out an announcement to every active user (admin announcements, FR-44).</summary>
    public async Task NotifyAllUsersAsync(string title, string body, string? link = null)
    {
        try
        {
            var users = await db.Users.Where(u => u.Status == UserStatus.ACTIVE).Select(u => u.Id).ToListAsync();
            if (users.Count == 0) return;
            foreach (var id in users)
                db.Notifications.Add(new Notification { Id = Cuid.New(), UserId = id, Title = title, Body = body, Link = link, CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }
        catch
        {
            // ignore
        }
    }
}
