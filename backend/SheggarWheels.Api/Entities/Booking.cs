// Booking — ported from prisma/schema.prisma model Booking.
namespace SheggarWheels.Api.Entities;

public class Booking
{
    public string Id { get; set; } = "";
    public string CarId { get; set; } = "";
    public string RenterId { get; set; } = "";
    public string OwnerId { get; set; } = "";
    // @db.Date columns (midnight UTC dates).
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int Days { get; set; }
    // Snapshots (BR-03/BR-04): frozen at request time.
    public int PricePerDay { get; set; }
    public int Subtotal { get; set; }               // pre-discount: pricePerDay × days
    public int DiscountPercent { get; set; } = 0;   // 0 = no discount (BR-03: frozen at request)
    public int DiscountAmount { get; set; } = 0;    // ETB saved, rounded
    public int Fee { get; set; }
    public int Total { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.REQUESTED;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.UNPAID; // FR-20/23/24
    public string? PaymentRef { get; set; }         // SW-DEMO-XXXX (FR-24)
    public string? PaymentMethod { get; set; }      // frozen at pay time (BR-03 spirit)
    // Driving licence submitted WITH the rental request — reviewed by the car OWNER.
    public string? LicenseNumber { get; set; }
    public string? LicenseImage { get; set; }       // data URL or https link
    public LicenseStatus LicenseStatus { get; set; } = LicenseStatus.PENDING;
    public string? LicenseDecisionNote { get; set; }
    // FR-49: drive-mode snapshot (BR-03 spirit) — frozen with the price.
    public DriveMode DriveMode { get; set; } = DriveMode.SELF_DRIVE;
    public string? DriverName { get; set; }         // OWN_DRIVER only
    public int DriverFeePerDay { get; set; } = 0;
    public int DriverTotal { get; set; } = 0;
    // FR-51 clickwrap proof: WHICH terms the renter accepted and WHEN, stamped by the SERVER.
    public string? TermsVersion { get; set; }
    public DateTime? TermsAgreedAt { get; set; }
    public string? PaymentTermsVersion { get; set; }
    public DateTime? PaymentTermsAgreedAt { get; set; }
    public BookingStatus? StatusBeforeDispute { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Car Car { get; set; } = null!;
    public User Renter { get; set; } = null!;
    public User Owner { get; set; } = null!;
    public Review? Review { get; set; }
    public List<Dispute> Disputes { get; set; } = new();
}
