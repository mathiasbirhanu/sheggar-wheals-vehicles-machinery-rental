// Payment method registry (FR-23/24) — the SINGLE source of truth for every
// checkout surface. Like Turo consolidating pay-ins on one gateway, adding a
// new Ethiopian method means adding ONE object here; the picker, validation,
// references and labels all follow automatically. No card numbers are ever
// collected — Chapa (the gateway) would handle card data on its own page.
export type PaymentMethodId = "telebirr" | "cbebirr" | "mpesa" | "chapa";

export type PaymentMethod = {
  id: PaymentMethodId;
  label: string; // frozen into Booking.paymentMethod
  operator: string;
  tagline: string; // one-liner on the method card
  contactLabel: string; // label of the detail input this method needs
  contactPlaceholder: string;
  contactHint: string; // explains what happens after "Pay" (demo-honest)
  refPrefix: string; // SW-DEMO-<PREFIX>-XXXX (FR-24)
  mark: string; // 1-2 letter brand mark on the tile
  markClass: string; // tile colour (Tailwind classes)
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "telebirr",
    label: "TeleBirr",
    operator: "Ethio Telecom",
    tagline: "Mobile money wallet",
    contactLabel: "TeleBirr mobile number",
    contactPlaceholder: "09xx xxx xxx",
    contactHint: "You would approve a push prompt in the TeleBirr app — simulated here.",
    refPrefix: "TB",
    mark: "T",
    markClass: "bg-emerald-600",
  },
  {
    id: "cbebirr",
    label: "CBE Birr",
    operator: "Commercial Bank of Ethiopia",
    tagline: "Bank wallet & mobile banking",
    contactLabel: "CBE account or mobile number",
    contactPlaceholder: "1000… / 09xx…",
    contactHint: "You would authenticate in the CBE Birr app — simulated here.",
    refPrefix: "CBE",
    mark: "CB",
    markClass: "bg-violet-600",
  },
  {
    id: "mpesa",
    label: "M-Pesa",
    operator: "Safaricom Ethiopia",
    tagline: "Mobile money wallet",
    contactLabel: "M-Pesa mobile number",
    contactPlaceholder: "09xx xxx xxx",
    contactHint: "You would approve the STK push on your phone — simulated here.",
    refPrefix: "MP",
    mark: "M",
    markClass: "bg-rose-600",
  },
  {
    id: "chapa",
    label: "Chapa",
    operator: "Payment gateway",
    tagline: "Visa · Mastercard · bank transfer",
    contactLabel: "Email or mobile for the receipt",
    contactPlaceholder: "you@example.com / 09xx…",
    contactHint: "You would be redirected to Chapa's secure page — card data never touches our servers. Simulated here.",
    refPrefix: "CH",
    mark: "Ch",
    markClass: "bg-sky-600",
  },
];

export const PAYMENT_METHOD_IDS = PAYMENT_METHODS.map((m) => m.id) as [PaymentMethodId, ...PaymentMethodId[]];

export function getPaymentMethod(id: string): PaymentMethod | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id);
}
