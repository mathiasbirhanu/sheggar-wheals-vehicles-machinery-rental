// Domain types — the TypeScript mirror of the Prisma schema, now backed by the
// C# API. The enum OBJECTS keep the exact same string values PostgreSQL stores,
// and the entity types describe the JSON the API returns (dates are revived
// into real Date objects by lib/api.ts, so page code keeps working unchanged).

// ── Enums (string values match the PostgreSQL enum labels 1:1) ──────────────
export const Role = { RENTER: "RENTER", OWNER: "OWNER", ADMIN: "ADMIN" } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = { ACTIVE: "ACTIVE", SUSPENDED: "SUSPENDED" } as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const CarStatus = { DRAFT: "DRAFT", PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED", INACTIVE: "INACTIVE" } as const;
export type CarStatus = (typeof CarStatus)[keyof typeof CarStatus];

export const Transmission = { AUTOMATIC: "AUTOMATIC", MANUAL: "MANUAL" } as const;
export type Transmission = (typeof Transmission)[keyof typeof Transmission];

export const FuelType = { PETROL: "PETROL", DIESEL: "DIESEL", HYBRID: "HYBRID", ELECTRIC: "ELECTRIC" } as const;
export type FuelType = (typeof FuelType)[keyof typeof FuelType];

export const BookingStatus = {
  REQUESTED: "REQUESTED", CONFIRMED: "CONFIRMED", IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED", REVIEWED: "REVIEWED", DECLINED: "DECLINED",
  CANCELLED: "CANCELLED", DISPUTED: "DISPUTED", RESOLVED: "RESOLVED",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentStatus = { UNPAID: "UNPAID", HELD: "HELD", PAID: "PAID", REFUNDED: "REFUNDED" } as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const LicenseStatus = { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" } as const;
export type LicenseStatus = (typeof LicenseStatus)[keyof typeof LicenseStatus];

export const DriveMode = { SELF_DRIVE: "SELF_DRIVE", OWN_DRIVER: "OWN_DRIVER", OWNER_DRIVER: "OWNER_DRIVER" } as const;
export type DriveMode = (typeof DriveMode)[keyof typeof DriveMode];

export const DisputeStatus = { OPEN: "OPEN", RESOLVED: "RESOLVED" } as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const AnnouncementKind = { NEWS: "NEWS", EVENT: "EVENT", DISCOUNT: "DISCOUNT" } as const;
export type AnnouncementKind = (typeof AnnouncementKind)[keyof typeof AnnouncementKind];

// ── Entities (JSON shapes from the C# API; DateTime fields arrive as Date) ──
export type User = {
  id: string; email: string; name: string; phone: string | null;
  passwordHash?: string | null; roles: Role[]; status: UserStatus;
  rentalLicenseDoc: string | null; createdAt: Date; updatedAt: Date;
  // Included only by /api/view/admin/users/{id}:
  renterBookings?: Booking[];
  cars?: Car[];
};

export type Car = {
  id: string; ownerId: string; make: string; model: string; year: number;
  transmission: Transmission; fuelType: FuelType; seats: number; city: string;
  neighbourhood: string; lat: number; lng: number; pricePerDay: number;
  description: string; photos: string[]; valuationDoc: string | null;
  valuationAmount: number | null; driverFeePerDay: number | null;
  status: CarStatus; unavailableDates: Date[]; createdAt: Date; updatedAt: Date;
  // Included by the endpoints that need them (Prisma include semantics):
  owner?: User;
  reviews?: Review[];
  bookings?: Booking[];
  announcements?: Announcement[];
};

export type Booking = {
  id: string; carId: string; renterId: string; ownerId: string;
  startDate: Date; endDate: Date; days: number;
  pricePerDay: number; subtotal: number; discountPercent: number; discountAmount: number;
  fee: number; total: number; status: BookingStatus; paymentStatus: PaymentStatus;
  paymentRef: string | null; paymentMethod: string | null;
  licenseNumber: string | null; licenseImage: string | null;
  licenseStatus: LicenseStatus; licenseDecisionNote: string | null;
  driveMode: DriveMode; driverName: string | null;
  driverFeePerDay: number; driverTotal: number;
  termsVersion: string | null; termsAgreedAt: Date | null;
  paymentTermsVersion: string | null; paymentTermsAgreedAt: Date | null;
  statusBeforeDispute: BookingStatus | null;
  createdAt: Date; updatedAt: Date;
  // Included by the endpoints that need them (Prisma include semantics):
  car: Car; renter: User; owner: User; review?: Review | null;
};

export type Review = {
  id: string; bookingId: string; carId: string; renterId: string; ownerId: string;
  rating: number; comment: string; ownerReply: string | null;
  repliedAt: Date | null; createdAt: Date;
  // Included by the endpoints that need them (Prisma include semantics):
  car: Car; renter: User; owner: User;
};

export type Dispute = {
  id: string; bookingId: string; openedById: string; reason: string;
  status: DisputeStatus; resolutionNotes: string | null;
  resolvedById: string | null; resolvedAt: Date | null; createdAt: Date;
  // Included by the endpoints that need them (Prisma include semantics):
  booking: Booking; openedBy: User; resolvedBy?: User | null;
};

export type Announcement = {
  id: string; title: string; body: string; kind: AnnouncementKind;
  discountPercent: number | null; carId: string | null;
  validUntil: Date | null; active: boolean; createdById: string; createdAt: Date;
  // Included by the endpoints that need them (Prisma include semantics):
  createdBy: User; car?: Car | null;
};

export type Notification = {
  id: string; userId: string; title: string; body: string;
  link: string | null; read: boolean; createdAt: Date;
};
