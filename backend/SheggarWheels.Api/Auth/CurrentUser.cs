// CurrentUser — resolves the signed-in user from the sw_session cookie on every
// request (port of src/lib/auth.ts getCurrentUser). One DB hit per request,
// cached for the lifetime of the scoped service.
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Infrastructure;

namespace SheggarWheels.Api.Auth;

// Same shape the frontend's SessionUser type expects (a pick of the User fields).
public record SessionUser(string Id, string Email, string Name, string? Phone, List<Role> Roles, UserStatus Status);

public class CurrentUser(AppDbContext db, IConfiguration config, IHttpContextAccessor http)
{
    private SessionUser? _cached;
    private bool _resolved;

    public static string? ConfiguredSecret => Environment.GetEnvironmentVariable("SESSION_SECRET");

    public static string Secret =>
        ConfiguredSecret is { Length: > 0 } s ? s : SessionTokens.FallbackDevSecret;

    public static bool UsingFallbackSecret => string.IsNullOrEmpty(ConfiguredSecret);

    public string? ClientToken =>
        http.HttpContext?.Request.Cookies.TryGetValue(SessionTokens.CookieName, out var v) == true ? v : null;

    public SessionUser? User
    {
        get
        {
            if (_resolved) return _cached;
            _resolved = true;
            var userId = SessionTokens.Verify(ClientToken, Secret);
            if (userId == null) return null;
            var user = db.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null) return null;
            _cached = new SessionUser(user.Id, user.Email, user.Name, user.Phone, user.Roles, user.Status);
            return _cached;
        }
    }

    public SessionUser RequireUser()
    {
        var user = User ?? throw new ApiGuardException(GuardCode.Unauthenticated);
        return user;
    }

    public SessionUser RequireActiveUser()
    {
        var user = RequireUser();
        if (user.Status == UserStatus.SUSPENDED) throw new ApiGuardException(GuardCode.Suspended);
        return user;
    }

    public SessionUser RequireRole(params Role[] allowed)
    {
        var user = RequireActiveUser();
        if (!user.Roles.Any(r => allowed.Contains(r))) throw new ApiGuardException(GuardCode.Forbidden);
        return user;
    }
}

public enum GuardCode { Unauthenticated, Suspended, Forbidden }

/// <summary>Mirrors the Next.js guards: unauthenticated → /signin, suspended → /suspended,
/// missing role → home. The thin server actions translate these into redirects.</summary>
public class ApiGuardException(GuardCode code) : Exception(code.ToString())
{
    public GuardCode Code { get; } = code;
}
