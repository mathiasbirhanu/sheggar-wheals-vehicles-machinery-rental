// Google OAuth 2.0 (OpenID Connect) — port of src/lib/google-auth.ts.
// Hand-rolled with HttpClient — no external auth libraries, exactly like the
// original. Only "who is this email?" is needed; sessions stay our own cookies.
using System.Net.Http.Headers;
using System.Text.Json;
using SheggarWheels.Api.Infrastructure;

namespace SheggarWheels.Api.Auth;

public record GoogleProfile(string Sub, string Email, bool EmailVerified, string? Name);

public class GoogleOAuth(IHttpClientFactory httpFactory, IConfiguration config, ILogger<GoogleOAuth> log)
{
    private const string AuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string UserinfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";

    public bool IsEnabled =>
        !string.IsNullOrEmpty(config["GOOGLE_CLIENT_ID"]) && !string.IsNullOrEmpty(config["GOOGLE_CLIENT_SECRET"]);

    private (string ClientId, string ClientSecret) Credentials()
    {
        var clientId = config["GOOGLE_CLIENT_ID"] ?? "";
        var clientSecret = config["GOOGLE_CLIENT_SECRET"] ?? "";
        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            throw new InvalidOperationException("Google OAuth is not configured");
        return (clientId, clientSecret);
    }

    /// <summary>The callback URL must byte-match the one registered in Google Cloud Console.</summary>
    public static string CallbackUrl(string origin) => $"{origin}/api/auth/google/callback";

    /// <summary>Derive the PUBLIC origin from proxy headers (not Request.Host — behind
    /// tunnels/proxies the host header is an internal address, and Google requires
    /// the redirect_uri to byte-match the Console registration).</summary>
    public static string RequestOrigin(HttpContext ctx)
    {
        var req = ctx.Request;
        var host = req.Headers["x-forwarded-host"].FirstOrDefault() ?? req.Host.Value;
        var proto = req.Headers["x-forwarded-proto"].FirstOrDefault()?.Split(',')[0].Trim()
                    ?? req.Scheme;
        return $"{proto}://{host}";
    }

    /// <summary>Consent-screen URL. `state` is our CSRF token (verified in the callback).</summary>
    public string BuildAuthUrl(string origin, string state)
    {
        var (clientId, _) = Credentials();
        var query = new Dictionary<string, string?>
        {
            ["client_id"] = clientId,
            ["redirect_uri"] = CallbackUrl(origin),
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
            // Let the user pick an account every time — avoids silent wrong-account logins.
            ["prompt"] = "select_account",
        };
        return AuthEndpoint + "?" + new FormUrlEncodedContent(query).ReadAsStringAsync().Result;
    }

    /// <summary>OAuth 2.0 authorization-code exchange. Throws with the provider error text.</summary>
    public async Task<string> ExchangeCodeAsync(string code, string origin)
    {
        var (clientId, clientSecret) = Credentials();
        var http = httpFactory.CreateClient("google");
        using var form = new FormUrlEncodedContent(new Dictionary<string, string?>
        {
            ["code"] = code,
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["redirect_uri"] = CallbackUrl(origin),
            ["grant_type"] = "authorization_code",
        });
        using var res = await http.PostAsync(TokenEndpoint, form);
        if (!res.IsSuccessStatusCode)
        {
            var text = await res.Content.ReadAsStringAsync();
            log.LogError("google token exchange failed {Status}", (int)res.StatusCode);
            throw new InvalidOperationException($"google token exchange failed ({(int)res.StatusCode}) {Truncate(text, 200)}");
        }
        var json = await res.Content.ReadAsStringAsync();
        var accessToken = Json.Deserialize<Dictionary<string, JsonElement>>(json)?["access_token"].GetString();
        return accessToken ?? throw new InvalidOperationException("google token response missing access_token");
    }

    /// <summary>Fetch the OpenID Connect profile for an access token.</summary>
    public async Task<GoogleProfile> FetchProfileAsync(string accessToken)
    {
        var http = httpFactory.CreateClient("google");
        using var req = new HttpRequestMessage(HttpMethod.Get, UserinfoEndpoint);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var res = await http.SendAsync(req);
        if (!res.IsSuccessStatusCode)
        {
            log.LogError("google userinfo fetch failed {Status}", (int)res.StatusCode);
            throw new InvalidOperationException($"google userinfo failed ({(int)res.StatusCode})");
        }
        var json = await res.Content.ReadAsStringAsync();
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;
        return new GoogleProfile(
            root.GetProperty("sub").GetString() ?? "",
            root.GetProperty("email").GetString() ?? "",
            root.TryGetProperty("email_verified", out var ev) && ev.GetBoolean(),
            root.TryGetProperty("name", out var n) ? n.GetString() : null);
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];
}
