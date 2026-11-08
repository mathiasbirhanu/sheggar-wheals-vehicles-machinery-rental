// Password policy — port of src/lib/password-policy.ts (server-side rules).
// Rules (creation-time only; sign-in just requires a non-empty password):
//   1. 8–72 characters  2. uppercase  3. lowercase  4. digit  5. special
//   6. not a commonly-used / breached password
// Plus server-side: the password must not embed the email local-part or the name.
using System.Text.RegularExpressions;

namespace SheggarWheels.Api.Services;

public static class PasswordPolicy
{
    public const int Min = 8;
    public const int Max = 72;

    /// <summary>Shared demo password for the seeded accounts. Public by design (capstone demo).</summary>
    public const string DemoAccountPassword = "Sheggar!2026";

    private static readonly string[] CommonClassic =
    [
        "password", "password1", "password123", "passw0rd", "1q2w3e4r",
        "123456", "1234567", "12345678", "123456789", "1234567890", "121212",
        "123123", "123321", "qwerty", "qwerty123", "qwertyuiop", "qazwsx",
        "abc123", "abc12345", "letmein", "welcome", "welcome1", "admin123",
        "administrator", "iloveyou", "monkey", "dragon", "football", "baseball",
        "princess", "sunshine", "shadow", "master", "superman", "batman",
        "trustno1", "whatever", "starwars", "freedom", "pass123", "test123",
    ];

    private static readonly string[] CommonContext =
        ["sheggar", "sheggarwheels", "ethiopia", "addis", "addisababa", "habesha", "admin"];

    private static readonly string[] ClassicEmbeddable = CommonClassic.Where(w => w.Length >= 6).ToArray();

    private static bool IsCommonPassword(string pw)
    {
        var lower = pw.ToLowerInvariant();
        var core = Regex.Replace(lower, "[^a-z0-9]", ""); // "Password1!" → "password1"
        if (CommonClassic.Contains(lower) || CommonClassic.Contains(core)) return true;
        if (CommonContext.Contains(lower) || CommonContext.Contains(core)) return true;
        return ClassicEmbeddable.Any(w => core.Contains(w));
    }

    public record Check(string Id, string Label, bool Ok);

    public static List<Check> PasswordChecks(string pw) =>
    [
        new("length", $"At least {Min} characters", pw.Length >= Min && pw.Length <= Max),
        new("upper", "An uppercase letter (A–Z)", Regex.IsMatch(pw, "[A-Z]")),
        new("lower", "A lowercase letter (a–z)", Regex.IsMatch(pw, "[a-z]")),
        new("digit", "A number (0–9)", Regex.IsMatch(pw, "\\d")),
        new("special", "A special character (!@#$…)", Regex.IsMatch(pw, "[^A-Za-z0-9\\s]")),
        new("uncommon", "Not a common password", pw.Length > 0 && !IsCommonPassword(pw)),
    ];

    /// <summary>First failing rule as a human message — used by the validators.</summary>
    public static string? FirstPasswordProblem(string pw)
    {
        var failed = PasswordChecks(pw).FirstOrDefault(c => !c.Ok);
        if (failed == null) return null;
        return failed.Id switch
        {
            "length" => pw.Length < Min
                ? $"Password must be at least {Min} characters."
                : $"Password must be at most {Max} characters.",
            "upper" => "Password must contain at least one uppercase letter.",
            "lower" => "Password must contain at least one lowercase letter.",
            "digit" => "Password must contain at least one number.",
            "special" => "Password must contain at least one special character (e.g. !@#$%).",
            "uncommon" => "That password is too common — choose something less predictable.",
            _ => "Password does not meet the security requirements.",
        };
    }

    /// <summary>Server-side contextual rule: reject passwords embedding the email local-part
    /// or any token of the display name. Tokens shorter than 3 chars are ignored.</summary>
    public static bool PasswordContainsIdentity(string pw, string email, string name)
    {
        var lower = pw.ToLowerInvariant();
        var tokens = new[] { email.Split('@')[0] }
            .Concat(name.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Where(t => t.Length >= 3);
        return tokens.Any(lower.Contains);
    }
}
