// FR-51 — RENTAL RULES & PAYMENT TERMS (clickwrap documents).
// Two short documents the renter must actively accept:
//   1. RENTAL rules  → accepted in the "Request booking" dialog (booking-form.tsx)
//   2. PAYMENT terms → accepted in the checkout "Agree & pay" dialog
// The VERSION strings are stamped on the booking row by the SERVER
// (Booking.termsVersion / paymentTermsVersion + their timestamps), so every
// booking proves exactly which text the renter signed. Bump the version and
// edit the lists whenever the rules change — old bookings keep their snapshot.
// Pure data, no side effects: imported by both client dialogs and server actions.

export const RENTAL_TERMS_VERSION = "v2"; // v2: self-drive licence is now reviewed by the OWNER with the request
export const PAYMENT_TERMS_VERSION = "v1";

export type TermIcon =
  | "key" // KeyRound — care / condition
  | "fuel" // Fuel — fuel policy
  | "shield" // ShieldCheck — damage & insurance
  | "clock" // Clock — late return
  | "calendar" // CalendarClock — cancellation
  | "id" // IdCard — licence validity
  | "user" // UserRound — own driver responsibility
  | "steering" // CarFront — owner's driver
  | "wallet" // Wallet — platform fee
  | "lock" // Lock — escrow hold
  | "refund" // RotateCcw — refunds
  | "eyeoff" // EyeOff — stay in-app
  | "flask" // FlaskConical — demo money
  | "alert"; // TriangleAlert — licence fraud / misuse

export type TermRule = { icon: TermIcon; title: string; body: string };

/** Common rental rules — shown for EVERY drive mode (booking request dialog). */
export const RENTAL_RULES: TermRule[] = [
  {
    icon: "key",
    title: "Drive with care",
    body: "Return the car in the condition you received it. Smoking inside the car and off-road driving are not allowed.",
  },
  {
    icon: "fuel",
    title: "Fuel level",
    body: "Return the car with the same fuel level it had at pickup. Missing fuel is settled at the current Addis Ababa pump price.",
  },
  {
    icon: "shield",
    title: "Damage & responsibility",
    body: "Any new damage found at return is the driver's responsibility and is settled through the platform's dispute process — photos at pickup and return are the evidence.",
  },
  {
    icon: "clock",
    title: "Late return",
    body: "Bringing the car back late blocks the next renter. Every late day is charged at the booked daily price, and repeated lateness can suspend the account.",
  },
  {
    icon: "calendar",
    title: "Cancellation",
    body: "You can cancel any time before the trip starts. If you already paid, the held amount is refunded — nothing is taken from a declined or cancelled trip.",
  },
];

/** One extra rule per drive mode — shown as the highlighted last item. */
export const MODE_RULES: Record<"SELF_DRIVE" | "OWN_DRIVER" | "OWNER_DRIVER", TermRule> = {
  SELF_DRIVE: {
    icon: "id",
    title: "Your licence must stay valid",
    body: "You confirm the licence you attach with the request is yours, valid for the whole trip, and stays valid. The car owner reviews it together with your booking. Driving outside Ethiopia is not allowed.",
  },
  OWN_DRIVER: {
    icon: "user",
    title: "You vouch for your driver",
    body: "The licence you attached must be genuine and belong to the named driver. A fake licence cancels the booking without refund, and you answer for your driver's conduct.",
  },
  OWNER_DRIVER: {
    icon: "steering",
    title: "The owner's driver stays in charge",
    body: "The professional driver sent by the owner keeps responsibility for the car. His daily fee covers the agreed trip days — plan extra days with the owner in advance.",
  },
};

/** Payment & escrow terms — accepted at checkout, right before paying. */
export const PAYMENT_RULES: TermRule[] = [
  {
    icon: "wallet",
    title: "10% platform fee",
    body: "The platform fee you see at checkout is 10% of the overall booking price — car plus any owner-driver fee. It pays for licence verification, support and escrow protection.",
  },
  {
    icon: "lock",
    title: "Your money is held in escrow",
    body: "Sheggar Wheels holds your payment after you pay. The owner receives it only after marking the trip complete — never before (BR-12).",
  },
  {
    icon: "refund",
    title: "When you get money back",
    body: "A held payment is refunded when the owner declines, when you cancel before the trip starts, or when a dispute resolves in your favour (BR-06/BR-07).",
  },
  {
    icon: "eyeoff",
    title: "Pay only inside Sheggar Wheels",
    body: "Never send cash or transfer money directly to an owner. Off-platform payments are not protected by escrow or dispute resolution.",
  },
  {
    icon: "flask",
    title: "Demo payment — no real money",
    body: "This is a university capstone project: payment references like SW-DEMO-… are simulated and no real money moves.",
  },
];
