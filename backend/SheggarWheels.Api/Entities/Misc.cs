// Review, Dispute, Announcement, Notification — ported from prisma/schema.prisma.
namespace SheggarWheels.Api.Entities;

public class Review
{
    public string Id { get; set; } = "";
    public string BookingId { get; set; } = "";     // BR-06: exactly one review per booking (unique)
    public string CarId { get; set; } = "";
    public string RenterId { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public int Rating { get; set; }                 // 1..5
    public string Comment { get; set; } = "";
    public string? OwnerReply { get; set; }
    public DateTime? RepliedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public Car Car { get; set; } = null!;
    public User Renter { get; set; } = null!;
    public User Owner { get; set; } = null!;
}

public class Dispute
{
    public string Id { get; set; } = "";
    public string BookingId { get; set; } = "";
    public string OpenedById { get; set; } = "";
    public string Reason { get; set; } = "";
    public DisputeStatus Status { get; set; } = DisputeStatus.OPEN;
    public string? ResolutionNotes { get; set; }
    public string? ResolvedById { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public User OpenedBy { get; set; } = null!;
    public User? ResolvedBy { get; set; }
}

public class Announcement
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public AnnouncementKind Kind { get; set; } = AnnouncementKind.NEWS;
    public int? DiscountPercent { get; set; }
    // A DISCOUNT can target exactly one car — that's what puts the −N% badge on
    // its card and applies the math to bookings of that car. Null = banner-only.
    public string? CarId { get; set; }
    public DateTime? ValidUntil { get; set; }
    public bool Active { get; set; } = true;
    public string CreatedById { get; set; } = "";
    public DateTime CreatedAt { get; set; }

    public User CreatedBy { get; set; } = null!;
    public Car? Car { get; set; }
}

public class Notification
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? Link { get; set; }
    public bool Read { get; set; } = false;
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
