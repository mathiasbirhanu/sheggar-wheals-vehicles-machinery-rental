// User — ported from prisma/schema.prisma model User.
// Property names follow C# convention (PascalCase); the EF mapping in
// Data/AppDbContext.cs pins every column to the exact name Prisma created.
namespace SheggarWheels.Api.Entities;

public class User
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";          // BR-01: unique across the demo
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    // Email+password credentials (scrypt: "scrypt$N$r$p$salt$hash").
    // Null = Google-only account (signs in with Google only).
    public string? PasswordHash { get; set; }
    public List<Role> Roles { get; set; } = new();   // FR-04: one account can be renter and owner
    public UserStatus Status { get; set; } = UserStatus.ACTIVE; // FR-06 / BR-10
    // FR-48: OPTIONAL legal rental licence uploaded at owner registration.
    public string? RentalLicenseDoc { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public List<Car> Cars { get; set; } = new();
    public List<Booking> RenterBookings { get; set; } = new();
    public List<Booking> OwnerBookings { get; set; } = new();
    public List<Review> ReviewsAsRenter { get; set; } = new();
    public List<Review> ReviewsAsOwner { get; set; } = new();
    public List<Dispute> DisputesOpened { get; set; } = new();
    public List<Dispute> DisputesResolved { get; set; } = new();
    public List<Notification> Notifications { get; set; } = new();
    public List<Announcement> Announcements { get; set; } = new();
}
