// Session tokens — byte-compatible port of src/lib/auth.ts.
// Cookie name "sw_session", token format "userId.expiryMs.hmacSha256Hex",
// signed with SESSION_SECRET (HMAC-SHA256, lowercase hex), 7-day expiry.
using System.Security.Cryptography;
using System.Text;

namespace SheggarWheels.Api.Infrastructure;

public static class SessionTokens
{
    public const string CookieName = "sw_session";
    public static readonly TimeSpan MaxAge = TimeSpan.FromDays(7); // 7 days
    public const string FallbackDevSecret = "sw_dev_fallback_secret";

    public static string Sign(string userId, string secret)
    {
        var exp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + (long)MaxAge.TotalSeconds * 1000;
        var payload = $"{userId}.{exp}";
        return $"{payload}.{HmacHex(secret, payload)}";
    }

    /// <summary>Returns the userId when the signature and expiry are valid, else null.</summary>
    public static string? Verify(string? token, string secret)
    {
        if (string.IsNullOrEmpty(token)) return null;
        var parts = token.Split('.');
        if (parts.Length != 3) return null;
        var (userId, exp, sig) = (parts[0], parts[1], parts[2]);
        var expected = HmacHex(secret, $"{userId}.{exp}");
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(sig), Encoding.UTF8.GetBytes(expected)))
            return null;
        if (!long.TryParse(exp, out var expMs) || expMs < DateTimeOffset.UtcNow.ToUnixTimeMilliseconds())
            return null;
        return userId;
    }

    private static string HmacHex(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }
}
