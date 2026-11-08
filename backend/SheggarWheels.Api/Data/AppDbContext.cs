// AppDbContext — the EF Core mirror of prisma/schema.prisma.
//
// RULES THIS FILE FOLLOWS (break any of them and the SQL stops matching):
//   1. Table names  = the Prisma model names verbatim ("User", "Car", ...) —
//      Prisma quotes them case-sensitively in PostgreSQL.
//   2. Column names = the Prisma FIELD names verbatim, camelCase
//      ("passwordHash", "pricePerDay", "createdAt", ...) — Prisma does NOT
//      convert case, so neither do we.
//   3. Enum columns are native PostgreSQL enum types (Prisma `enum` blocks),
//      mapped with HasPostgresEnum using the exact type name and labels.
//   4. No migrations ship with this project: the schema already exists in the
//      database (created by `prisma db push`). EF only needs the correct map
//      to SELECT / INSERT / UPDATE the same columns.
using Microsoft.EntityFrameworkCore;
using Npgsql.NameTranslation;
using SheggarWheels.Api.Entities;

namespace SheggarWheels.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Car> Cars => Set<Car>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Dispute> Disputes => Set<Dispute>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // EF-side enum registry: lets the type mapping source resolve "CarStatus",
        // "Role[]" etc. to the exact PascalCase PostgreSQL enum types Prisma created.
        // (Runtime parameter writing comes from MapEnum on the Npgsql data source.)
        var t = new NpgsqlNullNameTranslator();
        mb.HasPostgresEnum<Role>(null, "Role", t);
        mb.HasPostgresEnum<UserStatus>(null, "UserStatus", t);
        mb.HasPostgresEnum<CarStatus>(null, "CarStatus", t);
        mb.HasPostgresEnum<Transmission>(null, "Transmission", t);
        mb.HasPostgresEnum<FuelType>(null, "FuelType", t);
        mb.HasPostgresEnum<BookingStatus>(null, "BookingStatus", t);
        mb.HasPostgresEnum<PaymentStatus>(null, "PaymentStatus", t);
        mb.HasPostgresEnum<LicenseStatus>(null, "LicenseStatus", t);
        mb.HasPostgresEnum<DriveMode>(null, "DriveMode", t);
        mb.HasPostgresEnum<DisputeStatus>(null, "DisputeStatus", t);
        mb.HasPostgresEnum<AnnouncementKind>(null, "AnnouncementKind", t);

        // ── User ────────────────────────────────────────────────────────────
        var user = mb.Entity<User>();
        user.ToTable("User");
        user.HasKey(u => u.Id);
        user.Property(u => u.Id).HasColumnName("id").HasMaxLength(30);
        user.Property(u => u.Email).HasColumnName("email").IsRequired();
        user.HasIndex(u => u.Email).IsUnique();
        user.Property(u => u.Name).HasColumnName("name").IsRequired();
        user.Property(u => u.Phone).HasColumnName("phone");
        user.Property(u => u.PasswordHash).HasColumnName("passwordHash");
        // roles: Role[] (PostgreSQL enum array)
        user.Property(u => u.Roles).HasColumnName("roles").IsRequired();
        user.Property(u => u.Status).HasColumnName("status").HasColumnType("\"UserStatus\"").IsRequired();
        user.Property(u => u.RentalLicenseDoc).HasColumnName("rentalLicenseDoc");
        user.Property(u => u.CreatedAt).HasColumnName("createdAt").HasColumnType("timestamp(3)").HasDefaultValueSql("now()");
        user.Property(u => u.UpdatedAt).HasColumnName("updatedAt").HasColumnType("timestamp(3)");

        // ── Car ─────────────────────────────────────────────────────────────
        var car = mb.Entity<Car>();
        car.ToTable("Car");
        car.HasKey(c => c.Id);
        car.Property(c => c.Id).HasColumnName("id").HasMaxLength(30);
        car.Property(c => c.OwnerId).HasColumnName("ownerId").IsRequired();
        car.Property(c => c.Make).HasColumnName("make").IsRequired();
        car.Property(c => c.Model).HasColumnName("model").IsRequired();
        car.Property(c => c.Year).HasColumnName("year").IsRequired();
        car.Property(c => c.Transmission).HasColumnName("transmission").HasColumnType("\"Transmission\"").IsRequired();
        car.Property(c => c.FuelType).HasColumnName("fuelType").HasColumnType("\"FuelType\"").IsRequired();
        car.Property(c => c.Seats).HasColumnName("seats").IsRequired();
        car.Property(c => c.City).HasColumnName("city").IsRequired().HasDefaultValue("Addis Ababa");
        car.Property(c => c.Neighbourhood).HasColumnName("neighbourhood").IsRequired();
        car.Property(c => c.Lat).HasColumnName("lat").IsRequired();
        car.Property(c => c.Lng).HasColumnName("lng").IsRequired();
        car.Property(c => c.PricePerDay).HasColumnName("pricePerDay").IsRequired();
        car.Property(c => c.Description).HasColumnName("description").IsRequired();
        car.Property(c => c.Photos).HasColumnName("photos").HasColumnType("text[]").IsRequired();
        car.Property(c => c.ValuationDoc).HasColumnName("valuationDoc");
        car.Property(c => c.ValuationAmount).HasColumnName("valuationAmount");
        car.Property(c => c.DriverFeePerDay).HasColumnName("driverFeePerDay");
        car.Property(c => c.Status).HasColumnName("status").HasColumnType("\"CarStatus\"").IsRequired().HasDefaultValue(CarStatus.PENDING);
        car.Property(c => c.UnavailableDates).HasColumnName("unavailableDates").HasColumnType("timestamp without time zone[]").HasDefaultValueSql("'{}'::timestamp(3)[]");
        car.Property(c => c.CreatedAt).HasColumnName("createdAt").HasColumnType("timestamp(3)").HasDefaultValueSql("now()");
        car.Property(c => c.UpdatedAt).HasColumnName("updatedAt").HasColumnType("timestamp(3)");
        car.HasIndex(c => c.Status);
        car.HasIndex(c => c.OwnerId);
        car.HasOne(c => c.Owner).WithMany(u => u.Cars).HasForeignKey(c => c.OwnerId).OnDelete(DeleteBehavior.Restrict);

        // ── Booking ─────────────────────────────────────────────────────────
        var booking = mb.Entity<Booking>();
        booking.ToTable("Booking");
        booking.HasKey(b => b.Id);
        booking.Property(b => b.Id).HasColumnName("id").HasMaxLength(30);
        booking.Property(b => b.CarId).HasColumnName("carId").IsRequired();
        booking.Property(b => b.RenterId).HasColumnName("renterId").IsRequired();
        booking.Property(b => b.OwnerId).HasColumnName("ownerId").IsRequired();
        booking.Property(b => b.StartDate).HasColumnName("startDate").HasColumnType("date").IsRequired();
        booking.Property(b => b.EndDate).HasColumnName("endDate").HasColumnType("date").IsRequired();
        booking.Property(b => b.Days).HasColumnName("days").IsRequired();
        booking.Property(b => b.PricePerDay).HasColumnName("pricePerDay").IsRequired();
        booking.Property(b => b.Subtotal).HasColumnName("subtotal").IsRequired();
        booking.Property(b => b.DiscountPercent).HasColumnName("discountPercent").HasDefaultValue(0).IsRequired();
        booking.Property(b => b.DiscountAmount).HasColumnName("discountAmount").HasDefaultValue(0).IsRequired();
        booking.Property(b => b.Fee).HasColumnName("fee").IsRequired();
        booking.Property(b => b.Total).HasColumnName("total").IsRequired();
        booking.Property(b => b.Status).HasColumnName("status").HasColumnType("\"BookingStatus\"").IsRequired().HasDefaultValue(BookingStatus.REQUESTED);
        booking.Property(b => b.PaymentStatus).HasColumnName("paymentStatus").HasColumnType("\"PaymentStatus\"").IsRequired().HasDefaultValue(PaymentStatus.UNPAID);
        booking.Property(b => b.PaymentRef).HasColumnName("paymentRef");
        booking.Property(b => b.PaymentMethod).HasColumnName("paymentMethod");
        booking.Property(b => b.LicenseNumber).HasColumnName("licenseNumber");
        booking.Property(b => b.LicenseImage).HasColumnName("licenseImage");
        booking.Property(b => b.LicenseStatus).HasColumnName("licenseStatus").HasColumnType("\"LicenseStatus\"").IsRequired().HasDefaultValue(LicenseStatus.PENDING);
        booking.Property(b => b.LicenseDecisionNote).HasColumnName("licenseDecisionNote");
        booking.Property(b => b.DriveMode).HasColumnName("driveMode").HasColumnType("\"DriveMode\"").IsRequired().HasDefaultValue(DriveMode.SELF_DRIVE);
        booking.Property(b => b.DriverName).HasColumnName("driverName");
        booking.Property(b => b.DriverFeePerDay).HasColumnName("driverFeePerDay").HasDefaultValue(0).IsRequired();
        booking.Property(b => b.DriverTotal).HasColumnName("driverTotal").HasDefaultValue(0).IsRequired();
        booking.Property(b => b.TermsVersion).HasColumnName("termsVersion");
        booking.Property(b => b.TermsAgreedAt).HasColumnName("termsAgreedAt").HasColumnType("timestamp(3)");
        booking.Property(b => b.PaymentTermsVersion).HasColumnName("paymentTermsVersion");
        booking.Property(b => b.PaymentTermsAgreedAt).HasColumnName("paymentTermsAgreedAt").HasColumnType("timestamp(3)");
        booking.Property(b => b.StatusBeforeDispute).HasColumnName("statusBeforeDispute").HasColumnType("\"BookingStatus\"");
        booking.Property(b => b.CreatedAt).HasColumnName("createdAt").HasColumnType("timestamp(3)").HasDefaultValueSql("now()");
        booking.Property(b => b.UpdatedAt).HasColumnName("updatedAt").HasColumnType("timestamp(3)");
        booking.HasIndex(b => new { b.CarId, b.Status });
        booking.HasIndex(b => new { b.RenterId, b.Status });
        booking.HasIndex(b => new { b.OwnerId, b.Status });
        booking.HasOne(b => b.Car).WithMany(c => c.Bookings).HasForeignKey(b => b.CarId).OnDelete(DeleteBehavior.Restrict);
        booking.HasOne(b => b.Renter).WithMany(u => u.RenterBookings).HasForeignKey(b => b.RenterId).OnDelete(DeleteBehavior.Restrict);
        booking.HasOne(b => b.Owner).WithMany(u => u.OwnerBookings).HasForeignKey(b => b.OwnerId).OnDelete(DeleteBehavior.Restrict);

        // ── Review ──────────────────────────────────────────────────────────
        var review = mb.Entity<Review>();
        review.ToTable("Review");
        review.HasKey(r => r.Id);
        review.Property(r => r.Id).HasColumnName("id").HasMaxLength(30);
        review.Property(r => r.BookingId).HasColumnName("bookingId").IsRequired();
        review.HasIndex(r => r.BookingId).IsUnique();
        review.Property(r => r.CarId).HasColumnName("carId").IsRequired();
        review.Property(r => r.RenterId).HasColumnName("renterId").IsRequired();
        review.Property(r => r.OwnerId).HasColumnName("ownerId").IsRequired();
        review.Property(r => r.Rating).HasColumnName("rating").IsRequired();
        review.Property(r => r.Comment).HasColumnName("comment").IsRequired();
        review.Property(r => r.OwnerReply).HasColumnName("ownerReply");
        review.Property(r => r.RepliedAt).HasColumnName("repliedAt").HasColumnType("timestamp(3)");
        review.Property(r => r.CreatedAt).HasColumnName("createdAt").HasColumnType("timestamp(3)").HasDefaultValueSql("now()");
        review.HasIndex(r => r.CarId);
        review.HasIndex(r => r.OwnerId);
        review.HasOne(r => r.Booking).WithOne(b => b.Review).HasForeignKey<Review>(r => r.BookingId).OnDelete(DeleteBehavior.Restrict);
        review.HasOne(r => r.Car).WithMany(c => c.Reviews).HasForeignKey(r => r.CarId).OnDelete(DeleteBehavior.Restrict);
        review.HasOne(r => r.Renter).WithMany(u => u.ReviewsAsRenter).HasForeignKey(r => r.RenterId).OnDelete(DeleteBehavior.Restrict);
        review.HasOne(r => r.Owner).WithMany(u => u.ReviewsAsOwner).HasForeignKey(r => r.OwnerId).OnDelete(DeleteBehavior.Restrict);

        // ── Dispute ─────────────────────────────────────────────────────────
        var dispute = mb.Entity<Dispute>();
        dispute.ToTable("Dispute");
        dispute.HasKey(d => d.Id);
        dispute.Property(d => d.Id).HasColumnName("id").HasMaxLength(30);
        dispute.Property(d => d.BookingId).HasColumnName("bookingId").IsRequired();
        dispute.Property(d => d.OpenedById).HasColumnName("openedById").IsRequired();
        dispute.Property(d => d.Reason).HasColumnName("reason").IsRequired();
        dispute.Property(d => d.Status).HasColumnName("status").HasColumnType("\"DisputeStatus\"").IsRequired().HasDefaultValue(DisputeStatus.OPEN);
        dispute.Property(d => d.ResolutionNotes).HasColumnName("resolutionNotes");
        dispute.Property(d => d.ResolvedById).HasColumnName("resolvedById");
        dispute.Property(d => d.ResolvedAt).HasColumnName("resolvedAt").HasColumnType("timestamp(3)");
        dispute.Property(d => d.CreatedAt).HasColumnName("createdAt").HasColumnType("timestamp(3)").HasDefaultValueSql("now()");
        dispute.HasIndex(d => d.Status);
        dispute.HasIndex(d => d.BookingId);
        dispute.HasOne(d => d.Booking).WithMany(b => b.Disputes).HasForeignKey(d => d.BookingId).OnDelete(DeleteBehavior.Restrict);
        dispute.HasOne(d => d.OpenedBy).WithMany(u => u.DisputesOpened).HasForeignKey(d => d.OpenedById).OnDelete(DeleteBehavior.Restrict);
        dispute.HasOne(d => d.ResolvedBy).WithMany(u => u.DisputesResolved).HasForeignKey(d => d.ResolvedById).OnDelete(DeleteBehavior.Restrict);

        // ── Announcement ────────────────────────────────────────────────────
        var ann = mb.Entity<Announcement>();
        ann.ToTable("Announcement");
        ann.HasKey(a => a.Id);
        ann.Property(a => a.Id).HasColumnName("id").HasMaxLength(30);
        ann.Property(a => a.Title).HasColumnName("title").IsRequired();
        ann.Property(a => a.Body).HasColumnName("body").IsRequired();
        ann.Property(a => a.Kind).HasColumnName("kind").HasColumnType("\"AnnouncementKind\"").IsRequired().HasDefaultValue(AnnouncementKind.NEWS);
        ann.Property(a => a.DiscountPercent).HasColumnName("discountPercent");
        ann.Property(a => a.CarId).HasColumnName("carId");
        ann.Property(a => a.ValidUntil).HasColumnName("validUntil").HasColumnType("timestamp(3)");
        ann.Property(a => a.Active).HasColumnName("active").HasDefaultValue(true).IsRequired();
        ann.Property(a => a.CreatedById).HasColumnName("createdById").IsRequired();
        ann.Property(a => a.CreatedAt).HasColumnName("createdAt").HasColumnType("timestamp(3)").HasDefaultValueSql("now()");
        ann.HasIndex(a => new { a.Active, a.Kind, a.ValidUntil });
        ann.HasIndex(a => new { a.CarId, a.Active, a.Kind });
        ann.HasOne(a => a.CreatedBy).WithMany(u => u.Announcements).HasForeignKey(a => a.CreatedById).OnDelete(DeleteBehavior.Restrict);
        ann.HasOne(a => a.Car).WithMany(c => c.Announcements).HasForeignKey(a => a.CarId).OnDelete(DeleteBehavior.Restrict);

        // ── Notification ────────────────────────────────────────────────────
        var notif = mb.Entity<Notification>();
        notif.ToTable("Notification");
        notif.HasKey(n => n.Id);
        notif.Property(n => n.Id).HasColumnName("id").HasMaxLength(30);
        notif.Property(n => n.UserId).HasColumnName("userId").IsRequired();
        notif.Property(n => n.Title).HasColumnName("title").IsRequired();
        notif.Property(n => n.Body).HasColumnName("body").IsRequired();
        notif.Property(n => n.Link).HasColumnName("link");
        notif.Property(n => n.Read).HasColumnName("read").HasDefaultValue(false).IsRequired();
        notif.Property(n => n.CreatedAt).HasColumnName("createdAt").HasColumnType("timestamp(3)").HasDefaultValueSql("now()");
        notif.HasIndex(n => new { n.UserId, n.Read });
        notif.HasOne(n => n.User).WithMany(u => u.Notifications).HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Restrict);
    }

    /// <summary>Prisma's @updatedAt — refreshed on every UPDATE, in UTC.</summary>
    // NOTE: EF Core's public SaveChangesAsync() delegates to the (bool, CancellationToken)
    // core virtual — overriding the wrong overload silently bypasses the hook.
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampTimestamps();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void StampTimestamps()
    {
        var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added && entry.Metadata.FindProperty("CreatedAt") is { } created)
                entry.Property(created.Name).CurrentValue = now;
            if (entry.State is EntityState.Added or EntityState.Modified && entry.Metadata.FindProperty("UpdatedAt") is { } updated)
                entry.Property(updated.Name).CurrentValue = now;

            // Prisma convention: timestamp-without-time-zone columns store the UTC
            // WALL CLOCK with Kind=Unspecified. Npgsql rejects Kind=Utc on those
            // columns, so normalise every DateTime (and DateTime array) before write.
            foreach (var prop in entry.Properties)
            {
                if (prop.CurrentValue is DateTime dt && dt.Kind == DateTimeKind.Utc)
                    prop.CurrentValue = DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);
                else if (prop.CurrentValue is List<DateTime> list)
                    prop.CurrentValue = list.Select(d => d.Kind == DateTimeKind.Utc ? DateTime.SpecifyKind(d, DateTimeKind.Unspecified) : d).ToList();
                else if (prop.CurrentValue is DateTime[] arr)
                    prop.CurrentValue = arr.Select(d => d.Kind == DateTimeKind.Utc ? DateTime.SpecifyKind(d, DateTimeKind.Unspecified) : d).ToArray();
            }
        }
    }
}
