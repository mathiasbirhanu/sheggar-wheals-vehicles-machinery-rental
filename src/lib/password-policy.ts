// Password policy — the single source of truth for the "strong password" rules.
// Pure TypeScript (no node imports) so BOTH the server zod schema and the
// client-side live strength meter evaluate the exact same rules — the checklist
// the user sees while typing is the checklist the server enforces.
//
// Rules (creation-time only; sign-in just requires a non-empty password):
//   1. 8–72 characters          (72 = bcrypt-compatible ceiling, sane cap)
//   2. at least one UPPERCASE letter
//   3. at least one lowercase letter
//   4. at least one digit
//   5. at least one special character (!@#$%^&*…)
//   6. not a commonly-used / breached password (small embedded blocklist)
// Plus, server-side only (needs the rest of the form): the password must not
// contain the email local-part or any part of the display name.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/**
 * Shared demo password for the seeded accounts. Public by design — this is a
 * capstone demo and the sign-in page displays it so the examiner can sign in
 * as any seeded role. Real deployments would remove this entirely.
 */
export const DEMO_ACCOUNT_PASSWORD = "Sheggar!2026";

/**
 * Small blocklist of breached/trivial passwords (OWASP-style top list, trimmed).
 * Split in two tiers:
 *  - CLASSIC: widely breached passwords — rejected as exact matches AND when
 *    embedded anywhere inside the password ("Password1!", "qwerty!xyz").
 *  - CONTEXT: words an attacker familiar with this platform would try first
 *    (brand, city, country) — rejected only as the whole password, so a
 *    legitimate strong password merely *containing* "addis" still passes.
 */
const COMMON_CLASSIC = [
  "password", "password1", "password123", "passw0rd", "1q2w3e4r",
  "123456", "1234567", "12345678", "123456789", "1234567890", "121212",
  "123123", "123321", "qwerty", "qwerty123", "qwertyuiop", "qazwsx",
  "abc123", "abc12345", "letmein", "welcome", "welcome1", "admin123",
  "administrator", "iloveyou", "monkey", "dragon", "football", "baseball",
  "princess", "sunshine", "shadow", "master", "superman", "batman",
  "trustno1", "whatever", "starwars", "freedom", "pass123", "test123",
];
const COMMON_CONTEXT = [
  "sheggar", "sheggarwheels", "ethiopia", "addis", "addisababa", "habesha",
  "admin",
];

const CLASSIC_EMBEDDABLE = COMMON_CLASSIC.filter((w) => w.length >= 6);

/** True when the password is a common password, a trivial mutation of one, or a context guess. */
function isCommonPassword(pw: string): boolean {
  const lower = pw.toLowerCase();
  const core = lower.replace(/[^a-z0-9]/g, ""); // "Password1!" → "password1"
  if (COMMON_CLASSIC.includes(lower) || COMMON_CLASSIC.includes(core)) return true;
  if (COMMON_CONTEXT.includes(lower) || COMMON_CONTEXT.includes(core)) return true;
  return CLASSIC_EMBEDDABLE.some((w) => core.includes(w));
}

export type PasswordCheck = { id: string; label: string; ok: boolean };

/** Evaluate every creation-time rule. Used by zod (server) and the meter (client). */
export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN} characters`,
      ok: pw.length >= PASSWORD_MIN && pw.length <= PASSWORD_MAX,
    },
    { id: "upper", label: "An uppercase letter (A–Z)", ok: /[A-Z]/.test(pw) },
    { id: "lower", label: "A lowercase letter (a–z)", ok: /[a-z]/.test(pw) },
    { id: "digit", label: "A number (0–9)", ok: /\d/.test(pw) },
    {
      id: "special",
      label: "A special character (!@#$…)",
      ok: /[^A-Za-z0-9\s]/.test(pw),
    },
    {
      id: "uncommon",
      label: "Not a common password",
      ok: pw.length > 0 && !isCommonPassword(pw),
    },
  ];
}

/** First failing rule as a human message — used by the zod schema. */
export function firstPasswordProblem(pw: string): string | null {
  const checks = passwordChecks(pw);
  const failed = checks.find((c) => !c.ok);
  if (!failed) return null;
  switch (failed.id) {
    case "length":
      return pw.length < PASSWORD_MIN
        ? `Password must be at least ${PASSWORD_MIN} characters.`
        : `Password must be at most ${PASSWORD_MAX} characters.`;
    case "upper":
      return "Password must contain at least one uppercase letter.";
    case "lower":
      return "Password must contain at least one lowercase letter.";
    case "digit":
      return "Password must contain at least one number.";
    case "special":
      return "Password must contain at least one special character (e.g. !@#$%).";
    case "uncommon":
      return "That password is too common — choose something less predictable.";
    default:
      return "Password does not meet the security requirements.";
  }
}

/** 0–5 score for the live meter: how many rules currently pass. */
export function passwordStrength(pw: string): { score: number; total: number } {
  const checks = passwordChecks(pw);
  return { score: checks.filter((c) => c.ok).length, total: checks.length };
}

/**
 * Server-side contextual rule: reject passwords that embed the email
 * local-part or any token of the display name ("abebe" in abebe@x.com,
 * "kebede" in "Abebe Kebede"). Tokens shorter than 3 chars are ignored.
 */
export function passwordContainsIdentity(
  pw: string,
  email: string,
  name: string,
): boolean {
  const lower = pw.toLowerCase();
  const tokens = [
    email.split("@")[0],
    ...name.toLowerCase().split(/\s+/),
  ].filter((t) => t.length >= 3);
  return tokens.some((t) => lower.includes(t));
}
