// Car — ported from prisma/schema.prisma model Car.
namespace SheggarWheels.Api.Entities;

public class Car
{
    public string Id { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string Make { get; set; } = "";
    public string Model { get; set; } = "";
    public int Year { get; set; }
    public Transmission Transmission { get; set; }
    public FuelType FuelType { get; set; } = FuelType.PETROL; // FR-32 v2
    public int Seats { get; set; }
    public string City { get; set; } = "Addis Ababa";
    public string Neighbourhood { get; set; } = "";
    public double Lat { get; set; }
    public double Lng { get; set; }
    public int PricePerDay { get; set; }            // ETB, positive (FR-32)
    public string Description { get; set; } = "";
    public List<string> Photos { get; set; } = new(); // FR-34: text[] column
    // FR-47: technical valuation submitted with the listing (nullable for legacy rows).
    public string? ValuationDoc { get; set; }
    public int? ValuationAmount { get; set; }
    // FR-49: OPTIONAL professional driver offered BY THE OWNER with this car.
    // Null = the car cannot be booked in OWNER_DRIVER mode.
    public int? DriverFeePerDay { get; set; }
    public CarStatus Status { get; set; } = CarStatus.PENDING; // BR-02: only APPROVED is public
    public List<DateTime> UnavailableDates { get; set; } = new(); // FR-35 / BR-05: timestamp(3)[]
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User Owner { get; set; } = null!;
    public List<Booking> Bookings { get; set; } = new();
    public List<Review> Reviews { get; set; } = new();
    public List<Announcement> Announcements { get; set; } = new(); // discounts this car is running
}
