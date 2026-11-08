// SeedService — C# port of prisma/seed.ts (demo dataset, SRS Chapter 5).
// Idempotent: clears and re-creates. Trigger: POST /api/dev/seed with the
// SEED_TOKEN header (or any call in Development). Same rows, same maths,
// same scrypt hashing as the original — including the shared demo password.
using Microsoft.EntityFrameworkCore;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Infrastructure;

namespace SheggarWheels.Api.Services;

public class SeedService(AppDbContext db, ILogger<SeedService> log)
{
    private static DateTime D(string iso) => DateTime.SpecifyKind(DateTime.Parse(iso).Date, DateTimeKind.Unspecified);
    private static int Days(string s, string e) => (int)Math.Round((D(e) - D(s)).TotalDays) + 1;

    private static (int N, int Subtotal, int DriverTotal, int Fee, int Total) Money(int pricePerDay, string s, string e, int driverFeePerDay = 0)
    {
        var n = Days(s, e);
        var subtotal = pricePerDay * n;
        var driverTotal = driverFeePerDay * n; // FR-49: owner-driver fee joins the total
        var fee = (int)Math.Round((subtotal + driverTotal) * Pricing.PlatformFeeRate); // 10% of the OVERALL price
        return (n, subtotal, driverTotal, fee, subtotal + driverTotal + fee);
    }

    private static List<string> Ph(params string[] ids) =>
        ids.Select(id => $"https://images.unsplash.com/photo-{id}?w=900&q=80&auto=format&fit=crop").ToList();

    private static string Ref() =>
        "SW-DEMO-" + new string(Enumerable.Range(0, 4).Select(_ => "0123456789abcdefghijklmnopqrstuvwxyz"[Random.Shared.Next(36)]).ToArray()).ToUpperInvariant();

    public async Task<string> SeedAsync()
    {
        log.LogInformation("SEED: clearing existing demo data");
        await db.Notifications.ExecuteDeleteAsync();
        await db.Announcements.ExecuteDeleteAsync();
        await db.Disputes.ExecuteDeleteAsync();
        await db.Reviews.ExecuteDeleteAsync();
        await db.Bookings.ExecuteDeleteAsync();
        await db.Cars.ExecuteDeleteAsync();
        await db.Users.ExecuteDeleteAsync();

        // ── Users ────────────────────────────────────────────────────────────
        // Every seeded account gets the shared demo password (shown on /signin),
        // hashed per user so each row carries its own random scrypt salt.
        async Task<User> MkUser(string email, string name, string phone, List<Role> roles, UserStatus? status = null)
        {
            var u = new User
            {
                Id = Cuid.New(), Email = email, Name = name, Phone = phone,
                PasswordHash = Scrypt.HashPassword(PasswordPolicy.DemoAccountPassword),
                Roles = roles, Status = status ?? UserStatus.ACTIVE,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            };
            db.Users.Add(u);
            return u;
        }

        var admin = await MkUser("admin@sheggarwheels.et", "Demo Admin", "+251 911 000 001", [Role.ADMIN]);
        var daniel = await MkUser("daniel@sheggarwheels.et", "Daniel Bekele", "+251 911 234 567", [Role.OWNER]);
        var selam = await MkUser("selam@sheggarwheels.et", "Selam Tadesse", "+251 911 345 678", [Role.OWNER]);
        var aklilu = await MkUser("aklilu@sheggarwheels.et", "Aklilu Mengistu", "+251 911 456 789", [Role.OWNER]);
        var yonas = await MkUser("yonas@sheggarwheels.et", "Yonas Girma", "+251 912 111 222", [Role.RENTER]);
        var hanna = await MkUser("hanna@sheggarwheels.et", "Hanna Alemu", "+251 912 222 333", [Role.RENTER]);
        var mert = await MkUser("mert@sheggarwheels.et", "Mert Kebede", "+251 912 333 444", [Role.RENTER]);
        var ruth = await MkUser("ruth@sheggarwheels.et", "Ruth Wolde", "+251 912 444 555", [Role.RENTER, Role.OWNER]);
        await MkUser("kalkidan@sheggarwheels.et", "Kalkidan Assefa", "+251 912 555 666", [Role.RENTER], UserStatus.SUSPENDED);
        await db.SaveChangesAsync();

        // ── Cars (Addis Ababa neighbourhoods; coords are seeded sample points, C7) ──
        Car MkCar(string ownerId, string make, string model, int year, Transmission tr, FuelType fuel, int seats,
            string neighbourhood, double lat, double lng, int pricePerDay, string description,
            List<string> photos, CarStatus status, List<DateTime>? unavailable = null, int? driverFee = null)
        {
            var c = new Car
            {
                Id = Cuid.New(), OwnerId = ownerId, Make = make, Model = model, Year = year,
                Transmission = tr, FuelType = fuel, Seats = seats, Neighbourhood = neighbourhood,
                Lat = lat, Lng = lng, PricePerDay = pricePerDay, Description = description,
                Photos = photos, Status = status, UnavailableDates = unavailable ?? [],
                DriverFeePerDay = driverFee, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            };
            db.Cars.Add(c);
            return c;
        }

        var vitz = MkCar(daniel.Id, "Toyota", "Vitz", 2019, Transmission.MANUAL, FuelType.PETROL, 5, "Bole", 8.9936, 38.7871, 2800,
            "Fuel-saving city hatchback, perfect for Addis traffic. Well maintained, clean interior, AC works perfectly.",
            Ph("1606664515524-ed2f786a0bd6", "1503376780353-7e6692767b70", "1511919884226-fd3cad34687c"), CarStatus.APPROVED);
        var corolla = MkCar(daniel.Id, "Toyota", "Corolla", 2021, Transmission.AUTOMATIC, FuelType.HYBRID, 5, "Kazanchis", 9.0156, 38.7608, 3800,
            "Comfortable automatic sedan for business trips and family weekends. Large boot, very economical.",
            Ph("1549317661-bd32c8ce0db2", "1502877338535-766e1452684a"), CarStatus.APPROVED, driverFee: 900);
        var rav4 = MkCar(daniel.Id, "Toyota", "RAV4", 2020, Transmission.AUTOMATIC, FuelType.HYBRID, 5, "Old Airport", 8.9867, 38.7997, 5200,
            "Reliable SUV for weekend escapes to Debre Zeit or Entoto. AWD, spacious, roof rails.",
            Ph("1568605117036-5fe5e7bab0b7", "1519641471654-76ce0107ad1b"), CarStatus.APPROVED,
            unavailable: [D("2026-11-10"), D("2026-11-11"), D("2026-11-12")]);
        var dzire = MkCar(selam.Id, "Suzuki", "Dzire", 2022, Transmission.MANUAL, FuelType.PETROL, 4, "Gerji", 9.0068, 38.8117, 2600,
            "Brand-new compact sedan. Cheapest way to run errands or commute across town.",
            Ph("1541899481282-d53bffe3c35d", "1494976388531-d1058494cdd8"), CarStatus.APPROVED);
        var tucson = MkCar(selam.Id, "Hyundai", "Tucson", 2021, Transmission.AUTOMATIC, FuelType.DIESEL, 5, "CMC", 9.0269, 38.8305, 5500,
            "Premium compact SUV with reverse camera and cruise control. Great for longer trips.",
            Ph("1605559424843-9e4c228bf1c2", "1533473359331-0135ef1b58bf"), CarStatus.APPROVED, unavailable: [D("2026-12-01")]);
        var hilux = MkCar(selam.Id, "Toyota", "Hilux", 2018, Transmission.MANUAL, FuelType.DIESEL, 5, "Saris", 8.9708, 38.7469, 4800,
            "Double-cab pickup for deliveries, construction sites, and road trips outside Addis.",
            Ph("1571607388263-1044f9ea01dd"), CarStatus.APPROVED,
            unavailable: [D("2026-10-30"), D("2026-10-31"), D("2026-11-01")]);
        var polo = MkCar(aklilu.Id, "Volkswagen", "Polo", 2020, Transmission.MANUAL, FuelType.PETROL, 5, "Megenagna", 9.0186, 38.8026, 3200,
            "Solid German hatchback with excellent brakes and handling for city hills.",
            Ph("1550355291-bbee04a92027"), CarStatus.APPROVED);
        var accent = MkCar(aklilu.Id, "Hyundai", "Accent", 2019, Transmission.AUTOMATIC, FuelType.PETROL, 5, "Bole", 8.9881, 38.7906, 3400,
            "Smooth automatic sedan, ideal for airport pickups and drop-offs.",
            Ph("1583121274602-3e2820c69888"), CarStatus.APPROVED);
        var lexus = MkCar(aklilu.Id, "Lexus", "RX 350", 2017, Transmission.AUTOMATIC, FuelType.PETROL, 5, "Bole", 8.9921, 38.7829, 7500,
            "Luxury SUV for weddings, VIP transport, and special occasions.",
            Ph("1552519507-da3b142c6e3d"), CarStatus.APPROVED, driverFee: 1500);
        var landcruiser = MkCar(daniel.Id, "Toyota", "Land Cruiser", 2016, Transmission.AUTOMATIC, FuelType.DIESEL, 7, "Bole", 9.0011, 38.7796, 6800,
            "Seven-seat 4x4 for group trips and rough roads. Awaiting admin approval.",
            Ph("1544620347-c4fd1a88d917"), CarStatus.PENDING);
        MkCar(selam.Id, "Lifan", "Myway", 2018, Transmission.MANUAL, FuelType.PETROL, 5, "Kality", 8.9502, 38.7749, 2400,
            "Budget SUV, needs bodywork on the left door. Listed for transparency.",
            Ph("1542362567-b07e54358753"), CarStatus.REJECTED);
        // FR-32 v2: an electric category car so the fuel filter has a real hit.
        MkCar(selam.Id, "BYD", "Atto 3", 2023, Transmission.AUTOMATIC, FuelType.ELECTRIC, 5, "Bole", 8.9949, 38.7902, 6500,
            "Fully electric crossover with 420 km range — zero fuel cost. Charge overnight at home or at the Bole fast-charging station. Silent ride, instant torque, rotating screen.",
            Ph("1503376780353-7e6692767b70", "1560958089-a83b46b49279"), CarStatus.APPROVED);
        await db.SaveChangesAsync();

        // ── Bookings across the lifecycle (BR-03/04/05 maths; fee 10%) ────────
        var payMethods = new[] { "TeleBirr", "Chapa", "CBE Birr", "M-Pesa" }; // rotate for variety
        var pmIdx = 0;

        Booking Mk( Car car, string renterId, string ownerId, string s, string e,
            BookingStatus status, PaymentStatus pay, bool withRef = false,
            DriveMode? driveMode = null, string? driverName = null, int driverFeePerDay = 0, string? licenseNumber = null)
        {
            var mode = driveMode ?? DriveMode.SELF_DRIVE;
            var m = Money(car.PricePerDay, s, e, driverFeePerDay);
            var licenseStatus = mode == DriveMode.OWNER_DRIVER
                ? LicenseStatus.APPROVED // owner vouches for their own driver
                : status == BookingStatus.REQUESTED ? LicenseStatus.PENDING
                : status == BookingStatus.DECLINED ? LicenseStatus.REJECTED
                : LicenseStatus.APPROVED;
            var b = new Booking
            {
                Id = Cuid.New(), CarId = car.Id, RenterId = renterId, OwnerId = ownerId,
                StartDate = D(s), EndDate = D(e), Days = m.N, PricePerDay = car.PricePerDay,
                Subtotal = m.Subtotal, Fee = m.Fee, Total = m.Total,
                DriveMode = mode, DriverName = driverName,
                DriverFeePerDay = driverFeePerDay, DriverTotal = m.DriverTotal,
                LicenseStatus = licenseStatus, LicenseNumber = licenseNumber,
                Status = status, PaymentStatus = pay,
                PaymentRef = withRef ? Ref() : null,
                PaymentMethod = withRef ? payMethods[pmIdx++ % payMethods.Length] : null,
                StatusBeforeDispute = status == BookingStatus.DISPUTED ? BookingStatus.COMPLETED : null,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            };
            db.Bookings.Add(b);
            return b;
        }

        var b1 = Mk(vitz, yonas.Id, daniel.Id, "2026-07-12", "2026-07-15", BookingStatus.COMPLETED, PaymentStatus.PAID, true, licenseNumber: "ET-DL-221190");
        var b2 = Mk(corolla, hanna.Id, daniel.Id, "2026-08-02", "2026-08-03", BookingStatus.COMPLETED, PaymentStatus.PAID, true, licenseNumber: "ET-DL-334450");
        var b3 = Mk(rav4, mert.Id, daniel.Id, "2026-10-22", "2026-10-25", BookingStatus.CONFIRMED, PaymentStatus.HELD, true, DriveMode.OWNER_DRIVER, driverFeePerDay: 1000); // owner-driver trip — no licence review
        var b4 = Mk(vitz, hanna.Id, daniel.Id, "2026-10-21", "2026-10-22", BookingStatus.REQUESTED, PaymentStatus.UNPAID, false, DriveMode.OWN_DRIVER, driverName: "Bekele Ayana", licenseNumber: "ET-DM-778120"); // own driver — licence pending owner review
        var b5 = Mk(corolla, ruth.Id, daniel.Id, "2026-11-03", "2026-11-05", BookingStatus.REQUESTED, PaymentStatus.UNPAID, false, licenseNumber: "ET-DL-667890"); // self-drive request — renter's licence pending owner review
        var b6 = Mk(corolla, yonas.Id, daniel.Id, "2026-11-04", "2026-11-06", BookingStatus.REQUESTED, PaymentStatus.UNPAID, false, licenseNumber: "ET-DL-221190"); // overlaps b5 → BR-05 live demo
        var b7 = Mk(dzire, mert.Id, selam.Id, "2026-09-20", "2026-09-22", BookingStatus.COMPLETED, PaymentStatus.PAID, true, licenseNumber: "ET-DL-556780");
        var b8 = Mk(tucson, yonas.Id, selam.Id, "2026-10-19", "2026-10-26", BookingStatus.IN_PROGRESS, PaymentStatus.HELD, true, licenseNumber: "ET-DL-221190");
        var b9 = Mk(hilux, ruth.Id, selam.Id, "2026-08-28", "2026-08-30", BookingStatus.DECLINED, PaymentStatus.UNPAID, false, licenseNumber: "ET-DL-667890"); // declined → licence rejected with it
        var b10 = Mk(polo, hanna.Id, aklilu.Id, "2026-06-14", "2026-06-17", BookingStatus.COMPLETED, PaymentStatus.PAID, true, licenseNumber: "ET-DL-334450");
        var b11 = Mk(accent, mert.Id, aklilu.Id, "2026-10-05", "2026-10-07", BookingStatus.CANCELLED, PaymentStatus.REFUNDED, true, licenseNumber: "ET-DL-556780");
        var b12 = Mk(lexus, yonas.Id, aklilu.Id, "2026-10-08", "2026-10-10", BookingStatus.DISPUTED, PaymentStatus.PAID, true, licenseNumber: "ET-DL-221190");
        var b13 = Mk(landcruiser, ruth.Id, selam.Id, "2026-05-01", "2026-05-04", BookingStatus.RESOLVED, PaymentStatus.PAID, true, licenseNumber: "ET-DL-667890");
        await db.SaveChangesAsync();

        // ── Reviews (BR-06) + one owner reply (FR-31) ─────────────────────────
        Review Rv(Booking b, Car car, string renterId, string ownerId, int rating, string comment, string? reply = null)
        {
            var r = new Review
            {
                Id = Cuid.New(), BookingId = b.Id, CarId = car.Id, RenterId = renterId, OwnerId = ownerId,
                Rating = rating, Comment = comment, OwnerReply = reply, RepliedAt = reply != null ? DateTime.UtcNow : null,
                CreatedAt = DateTime.UtcNow,
            };
            db.Reviews.Add(r);
            return r;
        }
        Rv(b1, vitz, yonas.Id, daniel.Id, 5, "The Vitz was spotless and Daniel met me right on time near Bole. Fuel economy is unbeatable for city errands.", "Thank you Yonas — you left it spotless too. Always welcome!");
        Rv(b2, corolla, hanna.Id, daniel.Id, 4, "Smooth pickup, car exactly as listed. Would have liked a second key, but the trip itself was perfect.");
        Rv(b7, dzire, mert.Id, selam.Id, 5, "Cheapest, easiest rental I have done in Addis. Selam's instructions were crystal clear.");
        Rv(b10, polo, hanna.Id, aklilu.Id, 3, "Good value and solid handling, but the AC was weak in the afternoon heat.", "Sorry Hanna — the AC is now re-gassed and tested. Thank you for the honest feedback.");
        Rv(b13, landcruiser, ruth.Id, selam.Id, 4, "The Land Cruiser handled the Mojo road like a champ. A few scuffs inside but nothing serious.");

        // ── Disputes (BR-07, FR-43) ───────────────────────────────────────────
        db.Disputes.Add(new Dispute { Id = Cuid.New(), BookingId = b12.Id, OpenedById = yonas.Id, Status = DisputeStatus.OPEN, CreatedAt = DateTime.UtcNow,
            Reason = "I returned the Lexus 40 minutes early, but I was still charged for a full extra day. Requesting a refund of the difference." });
        db.Disputes.Add(new Dispute { Id = Cuid.New(), BookingId = b13.Id, OpenedById = selam.Id, Status = DisputeStatus.RESOLVED, ResolvedById = admin.Id, ResolvedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow,
            Reason = "Renter reported a pre-existing scratch near the right rear wheel as new damage.",
            ResolutionNotes = "Checked handover photos — the scratch was recorded at pickup. No charge; booking resolved and closed." });

        // ── Announcements + Notifications (FR-44..46, BR-12) ──────────────────
        db.Announcements.Add(new Announcement { Id = Cuid.New(), Title = "Welcome to Sheggar Wheels (Demo)",
            Body = "This platform is a capstone demonstration. All payments are mock TeleBirr transactions and money is labelled as held until the trip completes. Cars and users are seeded demo data.",
            Active = true, CreatedById = admin.Id, CreatedAt = DateTime.UtcNow });
        // Owner-submitted events & discounts — approved ones are live on the home
        // banner; the last one is still awaiting admin approval (BR-02 gate, 3rd door).
        db.Announcements.AddRange(
            new Announcement { Id = Cuid.New(), Title = "Addis Auto Expo — free test-drives",
                Body = "Meet Sheggar Wheels owners at Meskel Square on 15 Nov. Five cars available for supervised test-drives around the circuit, 10:00-17:00.",
                Kind = AnnouncementKind.EVENT, Active = true, CreatedById = daniel.Id, ValidUntil = D("2026-11-16"), CreatedAt = DateTime.UtcNow },
            // Each DISCOUNT targets one car: badge on its card + maths applied to its bookings.
            new Announcement { Id = Cuid.New(), Title = "Weekend flash: 15% off the Tucson",
                Body = "Rules: 15% off Selam's Hyundai Tucson. Minimum 2 rental days, weekend pickup only. Cannot be combined with other offers.",
                Kind = AnnouncementKind.DISCOUNT, DiscountPercent = 15, CarId = tucson.Id, Active = true, CreatedById = selam.Id, ValidUntil = D("2026-11-30"), CreatedAt = DateTime.UtcNow },
            new Announcement { Id = Cuid.New(), Title = "First-trip promo: 10% off the Vitz",
                Body = "Rules: 10% off Daniel's Toyota Vitz in Bole. One discount per booking; applies at request time and is frozen into your booking (BR-03).",
                Kind = AnnouncementKind.DISCOUNT, DiscountPercent = 10, CarId = vitz.Id, Active = true, CreatedById = daniel.Id, ValidUntil = D("2026-12-31"), CreatedAt = DateTime.UtcNow },
            new Announcement { Id = Cuid.New(), Title = "Rainy-season sale: 20% off the Polo",
                Body = "Rules: 20% off Aklilu's Volkswagen Polo on weekday pickups. One discount per booking.",
                Kind = AnnouncementKind.DISCOUNT, DiscountPercent = 20, CarId = polo.Id, Active = false, CreatedById = aklilu.Id, ValidUntil = D("2026-12-15"), CreatedAt = DateTime.UtcNow });

        db.Notifications.AddRange(
            new Notification { Id = Cuid.New(), UserId = daniel.Id, Title = "New booking request", Body = "Hanna Alemu requested your Toyota Vitz for 21-22 Oct.", Link = "/owner/cars/" + vitz.Id + "/bookings", CreatedAt = DateTime.UtcNow },
            new Notification { Id = Cuid.New(), UserId = daniel.Id, Title = "Payment held in escrow", Body = "Mert Kebede's payment of ETB 22,880 is held until the RAV4 trip completes.", Link = "/bookings", CreatedAt = DateTime.UtcNow },
            new Notification { Id = Cuid.New(), UserId = daniel.Id, Title = "New review on your Vitz", Body = "Yonas Girma left a 5-star review.", Link = "/owner/reviews", Read = true, CreatedAt = DateTime.UtcNow },
            new Notification { Id = Cuid.New(), UserId = mert.Id, Title = "Your trip starts soon", Body = "RAV4 pickup is on 22 Oct at Old Airport. Payment is safely held.", Link = "/bookings/" + b3.Id, CreatedAt = DateTime.UtcNow },
            new Notification { Id = Cuid.New(), UserId = yonas.Id, Title = "Trip in progress", Body = "Enjoy the Hyundai Tucson! Mark the trip complete at return.", Link = "/bookings/" + b8.Id, CreatedAt = DateTime.UtcNow },
            new Notification { Id = Cuid.New(), UserId = hanna.Id, Title = "Booking request sent", Body = "Your request for the Toyota Vitz was sent to Daniel Bekele.", Link = "/bookings/" + b4.Id, CreatedAt = DateTime.UtcNow },
            new Notification { Id = Cuid.New(), UserId = admin.Id, Title = "New dispute opened", Body = "A trip on the Lexus RX 350 needs review.", Link = "/admin/disputes", CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync();
        log.LogInformation("SEED: done — 9 users, 12 cars, 13 bookings, 5 reviews, 2 disputes");
        return "Seeded: 9 users, 12 cars, 13 bookings, 5 reviews, 2 disputes";
    }
}
