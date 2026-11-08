// Payment method registry (FR-23/24) — port of src/lib/payments.ts. The SINGLE
// source of truth for every checkout surface. No card numbers are ever collected.
namespace SheggarWheels.Api.Services;

public record PaymentMethod(
    string Id, string Label, string Operator, string Tagline,
    string ContactLabel, string ContactPlaceholder, string ContactHint,
    string RefPrefix, string Mark, string MarkClass);

public static class PaymentsRegistry
{
    public static readonly PaymentMethod[] Methods =
    [
        new("telebirr", "TeleBirr", "Ethio Telecom", "Mobile money wallet",
            "TeleBirr mobile number", "09xx xxx xxx",
            "You would approve a push prompt in the TeleBirr app — simulated here.",
            "TB", "T", "bg-emerald-600"),
        new("cbebirr", "CBE Birr", "Commercial Bank of Ethiopia", "Bank wallet & mobile banking",
            "CBE account or mobile number", "1000… / 09xx…",
            "You would authenticate in the CBE Birr app — simulated here.",
            "CBE", "CB", "bg-violet-600"),
        new("mpesa", "M-Pesa", "Safaricom Ethiopia", "Mobile money wallet",
            "M-Pesa mobile number", "09xx xxx xxx",
            "You would approve the STK push on your phone — simulated here.",
            "MP", "M", "bg-rose-600"),
        new("chapa", "Chapa", "Payment gateway", "Visa · Mastercard · bank transfer",
            "Email or mobile for the receipt", "you@example.com / 09xx…",
            "You would be redirected to Chapa's secure page — card data never touches our servers. Simulated here.",
            "CH", "Ch", "bg-sky-600"),
    ];

    public static PaymentMethod? Get(string id) => Methods.FirstOrDefault(m => m.Id == id);
}
