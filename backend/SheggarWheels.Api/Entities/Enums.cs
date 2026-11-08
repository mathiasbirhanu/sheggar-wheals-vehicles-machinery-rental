// Prisma schema enums, ported 1:1. The names here MUST match the PostgreSQL
// enum types and labels that Prisma created in the database (see prisma/schema.prisma).
namespace SheggarWheels.Api.Entities;

public enum Role { RENTER, OWNER, ADMIN }

public enum UserStatus { ACTIVE, SUSPENDED }

public enum CarStatus { DRAFT, PENDING, APPROVED, REJECTED, INACTIVE }

public enum Transmission { AUTOMATIC, MANUAL }

// FR-32 (v2): fleet category — what the car runs on.
public enum FuelType { PETROL, DIESEL, HYBRID, ELECTRIC }

// Booking lifecycle (SRS Ch.6): 8 states + post-resolution restore.
public enum BookingStatus { REQUESTED, CONFIRMED, IN_PROGRESS, COMPLETED, REVIEWED, DECLINED, CANCELLED, DISPUTED, RESOLVED }

public enum PaymentStatus { UNPAID, HELD, PAID, REFUNDED }

// Driving-licence review, decided by the car OWNER on each booking request.
public enum LicenseStatus { PENDING, APPROVED, REJECTED }

// FR-49: how the trip will be driven — chosen by the renter at request time.
public enum DriveMode { SELF_DRIVE, OWN_DRIVER, OWNER_DRIVER }

public enum DisputeStatus { OPEN, RESOLVED }

public enum AnnouncementKind { NEWS, EVENT, DISCOUNT }
