// AuthController — ports of the auth server actions (src/actions/auth.ts) and
// the two Google OAuth routes (src/app/api/auth/google/*).
//
// Sign-in/sign-up/sign-out return the session token in the JSON body so the
// thin Next.js server action can relay the sw_session cookie to the browser.
// The OAuth routes are browser-facing (redirects through the Next.js rewrite)
// and set their cookies directly on the response.
using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Infrastructure;
using SheggarWheels.Api.Services;

namespace SheggarWheels.Api.Controllers;

[ApiController]
public class AuthController(
    AppDbContext db,
    CurrentUser currentUser,
    GoogleOAuth google,
    RateLimiter rateLimiter,
    ILogger<AuthController> log) : ControllerBase
{
    // Generic credential error — identical for "unknown email" and "wrong
    // password" so sign-in cannot be used to enumerate registered accounts.
    private const string BadCredentials = "Invalid email or password. Seeded accounts can be filled below.";

    private string ClientIp()
    {
        var forwarded = Request.Headers["x-forwarded-for"].FirstOrDefault()?.Split(',')[0].Trim();
        return forwarded ?? Request.Headers["x-real-ip"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }

    private string Secret => CurrentUser.Secret;

    // ── GET /api/auth/session — current signed-in user or null ─────────────
    [HttpGet("/api/auth/session")]
    public IActionResult Session()
    {
        var user = currentUser.User;
        return Ok(new { user });
    }

    // ── GET /api/auth/google-enabled — feature flag for the sign-in buttons ─
    [HttpGet("/api/auth/google-enabled")]
    public IActionResult GoogleEnabled() => Ok(new { enabled = google.IsEnabled });

    // ── POST /api/actions/signin ───────────────────────────────────────────
    public record SignInBody(string? Email, string? Password, string? Next);

    [HttpPost("/api/actions/signin")]
    public async Task<IActionResult> SignIn([FromBody] SignInBody body)
    {
        var rl = rateLimiter.Check($"signin:{ClientIp()}", 10, 60_000); // 10 attempts / min / IP
        if (!rl.Ok) return Ok(new { error = $"Too many sign-in attempts — try again in {rl.RetryAfterSec}s." });

        var error = Validators.SignIn(body.Email, body.Password);
        if (error != null) return Ok(new { error });

        var email = body.Email!.ToLowerInvariant().Trim();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            log.LogWarning("sign-in failed: unknown email {Email}", email);
            return Ok(new { error = BadCredentials });
        }
        // Google-only account (no local credential set) — point the user at the OAuth path.
        if (user.PasswordHash == null)
        {
            log.LogWarning("sign-in failed: password-less (Google-only) account {UserId} {Email}", user.Id, email);
            return Ok(new { error = "This account uses Google sign-in — tap \u201cContinue with Google\u201d above." });
        }
        if (!Scrypt.VerifyPassword(body.Password!, user.PasswordHash))
        {
            log.LogWarning("sign-in failed: wrong password {UserId} {Email}", user.Id, email);
            return Ok(new { error = BadCredentials });
        }
        if (user.Status == UserStatus.SUSPENDED)
        {
            // Checked only AFTER the password verifies, so the suspension message is
            // visible to the legitimate account holder, not to credential-guessers.
            log.LogWarning("sign-in blocked: suspended account {UserId} {Email}", user.Id, email);
            return Ok(new { error = "This account is suspended and cannot sign in (FR-06)." });
        }

        log.LogInformation("sign-in success {UserId} {Roles}", user.Id, string.Join(",", user.Roles));
        var next = SafeReturnPath(body.Next, "/dashboard");
        return Ok(new { ok = true, redirect = next, sessionToken = SessionTokens.Sign(user.Id, Secret) });
    }

    // ── POST /api/actions/signup ───────────────────────────────────────────
    public record SignUpBody(string? Name, string? Email, string? Phone, string? Password,
        string? ConfirmPassword, bool AsOwner, string? RentalLicenseDoc);

    [HttpPost("/api/actions/signup")]
    public async Task<IActionResult> SignUp([FromBody] SignUpBody body)
    {
        var rl = rateLimiter.Check($"signup:{ClientIp()}", 5, 60_000); // 5 accounts / min / IP
        if (!rl.Ok) return Ok(new { error = $"Too many sign-up attempts — try again in {rl.RetryAfterSec}s." });

        var error = Validators.SignUp(body.Name, body.Email, body.Phone, body.Password, body.ConfirmPassword, body.RentalLicenseDoc);
        if (error != null) return Ok(new { error });

        var email = body.Email!.ToLowerInvariant().Trim();
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (existing != null)
        {
            log.LogWarning("sign-up refused: duplicate email {Email}", email);
            return Ok(new { error = "That email is already registered — duplicate accounts are refused (BR-01)." });
        }

        var user = new User
        {
            Id = Cuid.New(),
            Email = email,
            Name = body.Name!,
            Phone = string.IsNullOrEmpty(body.Phone) ? null : body.Phone,
            PasswordHash = Scrypt.HashPassword(body.Password!),
            Roles = body.AsOwner ? [Role.OWNER, Role.RENTER] : [Role.RENTER],
            // FR-48: stored when the owner volunteered it
            RentalLicenseDoc = string.IsNullOrEmpty(body.RentalLicenseDoc) ? null : body.RentalLicenseDoc,
            Status = UserStatus.ACTIVE,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        log.LogInformation("sign-up success {UserId} {Roles}", user.Id, string.Join(",", user.Roles));
        return Ok(new { ok = true, redirect = "/dashboard", sessionToken = SessionTokens.Sign(user.Id, Secret) });
    }

    // ── POST /api/actions/signout ──────────────────────────────────────────
    [HttpPost("/api/actions/signout")]
    public IActionResult SignOutAction()
    {
        var user = currentUser.User;
        if (user != null) log.LogInformation("sign-out {UserId}", user.Id);
        return Ok(new { ok = true, redirect = "/", clearSession = true });
    }

    // ── GET /api/auth/google — OAuth entry point ───────────────────────────
    [HttpGet("/api/auth/google")]
    public async Task<IActionResult> GoogleStart()
    {
        if (!google.IsEnabled)
            return Redirect("/signin?error=google_not_configured");

        var limit = rateLimiter.Check($"oauth-start:{ClientIp()}", 20, 60_000);
        if (!limit.Ok)
            return Redirect("/signin?error=google_slow_down");

        var state = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        var origin = GoogleOAuth.RequestOrigin(HttpContext);
        var url = google.BuildAuthUrl(origin, state);

        // Where to land after a successful sign-in (sanitized; empty = default).
        var next = SafeReturnPath(Request.Query["next"].FirstOrDefault(), "");

        Response.Cookies.Append("sw_oauth_state", state, OAuthCookieOptions(600));
        if (!string.IsNullOrEmpty(next))
            Response.Cookies.Append("sw_oauth_next", next, OAuthCookieOptions(600));
        return Redirect(url);
    }

    // ── GET /api/auth/google/callback ──────────────────────────────────────
    [HttpGet("/api/auth/google/callback")]
    public async Task<IActionResult> GoogleCallback()
    {
        var q = Request.Query;

        // User pressed "Cancel" on the consent screen.
        if (q["error"].Count > 0) return OAuthFail("google_denied");

        var queryState = q["state"].FirstOrDefault();
        var cookieState = Request.Cookies["sw_oauth_state"];
        if (string.IsNullOrEmpty(queryState) || string.IsNullOrEmpty(cookieState) || queryState != cookieState)
            return OAuthFail("google_state"); // CSRF / replay / stale tab — refuse without touching the database.

        var code = q["code"].FirstOrDefault();
        if (string.IsNullOrEmpty(code)) return OAuthFail("google_failed");

        var limit = rateLimiter.Check($"oauth-callback:{ClientIp()}", 20, 60_000);
        if (!limit.Ok) return OAuthFail("google_slow_down");

        var origin = GoogleOAuth.RequestOrigin(HttpContext);

        string accessToken;
        try
        {
            accessToken = await google.ExchangeCodeAsync(code, origin);
        }
        catch
        {
            return OAuthFail("google_exchange");
        }

        GoogleProfile profile;
        try
        {
            profile = await google.FetchProfileAsync(accessToken);
        }
        catch
        {
            return OAuthFail("google_failed");
        }

        // Never link or create accounts on unverified Google emails.
        if (string.IsNullOrEmpty(profile.Email) || !profile.EmailVerified)
            return OAuthFail("google_unverified");

        // Link by verified email: an existing demo account with the same email is
        // signed into directly (BR-01 unique emails make this unambiguous).
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == profile.Email);
        if (user == null)
        {
            user = new User
            {
                Id = Cuid.New(),
                Email = profile.Email,
                Name = string.IsNullOrWhiteSpace(profile.Name) ? profile.Email.Split('@')[0] : profile.Name.Trim(),
                Roles = [Role.RENTER], // new Google users start as renters; they can add the owner role later
                Status = UserStatus.ACTIVE,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        if (user.Status == UserStatus.SUSPENDED)
        {
            // Same treatment as the demo sign-in: session NOT created, explained page.
            return Redirect(origin + "/suspended");
        }

        // Browser-facing flow: set the session cookie directly on the redirect response.
        Response.Cookies.Append(SessionTokens.CookieName, SessionTokens.Sign(user.Id, Secret), SessionCookieOptions());
        var nextCookie = Request.Cookies["sw_oauth_next"];
        var target = SafeReturnPath(nextCookie, "/dashboard");
        Response.Cookies.Delete("sw_oauth_state", OAuthCookieOptions(600));
        Response.Cookies.Delete("sw_oauth_next", OAuthCookieOptions(600));
        return Redirect(origin + target);
    }

    private CookieOptions OAuthCookieOptions(int maxAge) => new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Secure = IsHttpsBehindProxy(),
        Path = "/api/auth/google", // scoped: only the OAuth routes ever read these
        MaxAge = TimeSpan.FromSeconds(maxAge),
    };

    private CookieOptions SessionCookieOptions() => new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Secure = IsHttpsBehindProxy(),
        Path = "/",
        MaxAge = SessionTokens.MaxAge,
    };

    private bool IsHttpsBehindProxy() =>
        (Request.Headers["x-forwarded-proto"].FirstOrDefault()?.Split(',')[0].Trim() ?? Request.Scheme) == "https";

    private IActionResult OAuthFail(string code)
    {
        // requestOrigin (Host header) instead of Request.Host: behind proxies the
        // host header can be internal, which would leak 0.0.0.0 into redirects.
        var origin = GoogleOAuth.RequestOrigin(HttpContext);
        return Redirect($"{origin}/signin?error={code}");
    }

    /// <summary>BR-09: only internal, non-double-slash paths are safe return targets.</summary>
    internal static string SafeReturnPath(string? next, string fallback)
    {
        if (string.IsNullOrEmpty(next) || !next.StartsWith('/') || next.StartsWith("//") || next.StartsWith("/\\"))
            return fallback;
        return next;
    }
}
