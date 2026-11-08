// Zod validation for every mutating flow (NFR-10, FR-32..35).
import { z } from "zod";
import {
  firstPasswordProblem,
  passwordContainsIdentity,
  passwordChecks,
} from "@/lib/password-policy";

// Sign-in (v3): email + password. Strength rules apply at CREATION only —
// here a password just has to be present, or legacy/Google-only accounts
// would be un-signable.
export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

// Sign-up (v3): account creation now requires a STRONG password, typed twice.
// The shared rule engine (lib/password-policy) is evaluated per-check so the
// server rejects exactly what the live checklist flags.
export const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Enter a valid email address."),
    phone: z.string().min(7, "Enter a valid phone number.").max(20).optional().or(z.literal("")),
    password: z.string().superRefine((pw, ctx) => {
      const problem = firstPasswordProblem(pw);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
    confirmPassword: z.string().min(1, "Re-type the password to confirm it."),
    asOwner: z.boolean().optional(),
    // FR-48: OPTIONAL legal rental licence for owners — empty string (nothing
    // picked) and undefined both pass; a value must be a valid uploaded image.
    rentalLicenseDoc: z
      .string()
      .max(3_000_000, "Licence document is too large — pick a smaller image.")
      .refine((v) => v === "" || v.startsWith("data:image/") || v.startsWith("https://"), {
        message: "Licence document must be an uploaded image.",
      })
      .optional()
      .or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
    }
    // Contextual strength: the password must not embed the person's own
    // email or name — the first thing an attacker who saw one tries on the other.
    if (passwordContainsIdentity(v.password, v.email, v.name)) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password must not contain your email or name.",
      });
    }
  });

/** UI helper: which strong-rules currently pass (drives the live checklist). */
export function signUpPasswordChecks(pw: string) {
  return passwordChecks(pw);
}

// FR-49 (Turo-style): a rental request carries HOW the trip will be driven + the
// licence that covers whoever drives. Every licence is reviewed by the car OWNER
// together with the booking — there is no separate platform-admin licence
// approval. Conditional rules (superRefine):
//   SELF_DRIVE  → the RENTER'S OWN licence (number + photo) is required.
//   OWN_DRIVER  → the brought driver's name + licence (number + photo) are required.
//   OWNER_DRIVER → nothing extra; the server re-checks the car really offers a driver.
export const bookingSchema = z
  .object({
    carId: z.string().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a return date."),
    driveMode: z.enum(["SELF_DRIVE", "OWN_DRIVER", "OWNER_DRIVER"]),
    // These fields exist in the DOM only for SELF_DRIVE / OWN_DRIVER — FormData
    // returns NULL for them otherwise (e.g. in OWNER_DRIVER), so the schema must
    // accept null as "absent" (that was the "Invalid input" bug on agree & send).
    driverName: z.string().trim().max(80, "Driver name is too long.").nullable().optional(),
    driverLicenseNumber: z.string().trim().max(40, "Licence number is too long.").nullable().optional(),
    driverLicenseImage: z
      .string()
      .max(3_000_000, "Licence photo is too large — pick a smaller file.")
      .refine((v) => v === "" || v.startsWith("data:image/") || v.startsWith("https://"), {
        message: "Licence photo must be an uploaded image.",
      })
      .nullable()
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.driveMode === "SELF_DRIVE") {
      if (!v.driverLicenseNumber || v.driverLicenseNumber.length < 4) {
        ctx.addIssue({ code: "custom", path: ["driverLicenseNumber"], message: "Enter your driving licence number (at least 4 characters)." });
      }
      if (!v.driverLicenseImage || v.driverLicenseImage.length < 50) {
        ctx.addIssue({ code: "custom", path: ["driverLicenseImage"], message: "Upload a photo of your driving licence." });
      }
    }
    if (v.driveMode === "OWN_DRIVER") {
      if (!v.driverName || v.driverName.length < 2) {
        ctx.addIssue({ code: "custom", path: ["driverName"], message: "Enter the full name of the driver you are bringing." });
      }
      if (!v.driverLicenseNumber || v.driverLicenseNumber.length < 4) {
        ctx.addIssue({ code: "custom", path: ["driverLicenseNumber"], message: "Enter your driver's licence number (at least 4 characters)." });
      }
      if (!v.driverLicenseImage || v.driverLicenseImage.length < 50) {
        ctx.addIssue({ code: "custom", path: ["driverLicenseImage"], message: "Upload a photo of your driver's licence." });
      }
    }
  });

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating from 1 to 5.").max(5),
  comment: z.string().min(5, "Tell others a bit more (at least 5 characters).").max(1000),
});

export const replySchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().min(3, "Reply must be at least 3 characters.").max(500),
});

export const carSchema = z.object({
  make: z.string().min(2, "Make is required."),
  model: z.string().min(1, "Model is required."),
  year: z.coerce.number().int().min(1990, "Year must be 1990 or later.").max(new Date().getFullYear() + 1),
  transmission: z.enum(["AUTOMATIC", "MANUAL"]),
  fuelType: z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]),
  seats: z.coerce.number().int().min(2).max(9),
  city: z.string().min(2).default("Addis Ababa"),
  neighbourhood: z.string().min(2, "Neighbourhood is required."),
  pricePerDay: z.coerce.number().int().min(500, "Price must be at least ETB 500/day.").max(100000),
  description: z.string().min(20, "Describe the car in at least 20 characters.").max(2000),
  // FR-34 (v2): a photo is either an https image link the owner pasted, or a
  // device upload stored as a data:image/...;base64 URL (browser-resized).
  // Per-item length cap ≈ 2.2 MB of image data — belt in case JS resizing was bypassed.
  photos: z
    .array(
      z
        .string()
        .max(3_000_000, "One of the photos is too large — please use a smaller image.")
        .refine(
          (v) =>
            /^https:\/\/\S+$/.test(v) ||
            /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v),
          "Each photo must be an https image link or an uploaded photo."
        )
    )
    .min(1, "Add at least one photo.")
    .max(5, "A car can have at most 5 photos."),
  // FR-47: the technical valuation report is REQUIRED on every new/edited
  // listing — same storage pattern as the booking licence photo (data URL,
  // resized in the browser). valuationAmount is the owner-declared market
  // value in ETB, optional but validated when given.
  valuationDoc: z.preprocess(
    // missing key / null (no hidden input was submitted) becomes "" so the
    // friendly min() message fires instead of a raw zod type error
    (v) => (typeof v === "string" ? v : ""),
    z
      .string()
      .min(50, "Upload the technical valuation report — a photo or scan of the document.")
      .max(3_000_000, "Valuation document is too large — pick a smaller image.")
      .refine((v) => v.startsWith("data:image/") || v.startsWith("https://"), {
        message: "Valuation document must be an uploaded image.",
      })
  ),
  valuationAmount: z.coerce
    .number()
    .int("Market value must be a whole number of ETB.")
    .min(0, "Market value cannot be negative.")
    .max(100_000_000, "Market value looks too large — check the digits.")
    .optional(),
  // FR-49: OPTIONAL daily fee for the owner-provided driver. Empty → undefined
  // (car stays without the owner-driver option; on update the field is cleared).
  driverFeePerDay: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce
      .number()
      .int("Driver fee must be a whole number of ETB.")
      .min(100, "If you offer a driver, the fee must be at least ETB 100/day.")
      .max(50_000, "Driver fee looks too large — check the digits.")
      .optional()
  ),
});

export const disputeSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().min(15, "Explain the issue in at least 15 characters.").max(1000),
});

export const resolveDisputeSchema = z.object({
  disputeId: z.string().min(1),
  notes: z.string().min(10, "Record resolution notes (at least 10 characters).").max(1000),
});

export const announcementSchema = z.object({
  title: z.string().min(4, "Title must be at least 4 characters.").max(120),
  body: z.string().min(10, "Body must be at least 10 characters.").max(1000),
});

// Payment (FR-23/24): method comes from the registry in lib/payments.ts. The
// contact field is validated CONDITIONALLY — wallets need an Ethiopian mobile,
// while Chapa (gateway) accepts an email OR a mobile for the receipt.
export const paymentSchema = z
  .object({
    bookingId: z.string().min(1),
    method: z.enum(["telebirr", "cbebirr", "mpesa", "chapa"]),
    contact: z.string().trim().min(5, "Enter your payment contact details.").max(60),
  })
  .superRefine((v, ctx) => {
    const phone = v.contact.replace(/[\s\-()]/g, "");
    const isPhone = /^(\+251|0)?9\d{8}$/.test(phone);
    if (v.method === "chapa") {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contact);
      if (!isPhone && !isEmail) ctx.addIssue({ code: "custom", message: "Enter the email or mobile number registered with Chapa." });
    } else if (!isPhone) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Ethiopian mobile number (09xxxxxxxx)." });
    }
  });

export type ActionState = { ok?: boolean; error?: string; message?: string };
