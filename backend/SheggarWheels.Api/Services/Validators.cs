// Validators — C# ports of the zod schemas in src/lib/validation.ts.
// Every mutating endpoint validates its input here and returns the FIRST error
// message, exactly like zod's issues[0].message did — so the UI toasts show the
// identical text. Check ORDER matters and mirrors the zod schema field order.
using System.Text.RegularExpressions;

namespace SheggarWheels.Api.Services;

public static class Validators
{
    public static string? SignIn(string? email, string? password)
    {
        if (email == null || !IsEmail(email)) return "Enter a valid email address.";
        if (string.IsNullOrEmpty(password)) return "Enter your password.";
        return null;
    }

    public static string? SignUp(string? name, string? email, string? phone, string? password, string? confirmPassword, string? rentalLicenseDoc)
    {
        if (name == null || name.Length < 2) return "Name must be at least 2 characters.";
        if (email == null || !IsEmail(email)) return "Enter a valid email address.";
        // phone: optional, but when present 7..20 chars
        if (!string.IsNullOrEmpty(phone) && phone.Length < 7) return "Enter a valid phone number.";
        if (!string.IsNullOrEmpty(phone) && phone.Length > 20) return "Enter a valid phone number.";
        if (password == null) return "Enter your password.";
        var pwProblem = PasswordPolicy.FirstPasswordProblem(password);
        if (pwProblem != null) return pwProblem;
        if (string.IsNullOrEmpty(confirmPassword)) return "Re-type the password to confirm it.";
        // superRefine order: confirmPassword match FIRST, then identity embedding
        if (password != confirmPassword) return "Passwords do not match.";
        if (PasswordPolicy.PasswordContainsIdentity(password, email, name))
            return "Password must not contain your email or name.";
        // rentalLicenseDoc: optional; "" passes; a value must be data:image/ or https:// and ≤ 3MB
        if (!string.IsNullOrEmpty(rentalLicenseDoc))
        {
            if (rentalLicenseDoc.Length > 3_000_000) return "Licence document is too large — pick a smaller image.";
            if (!rentalLicenseDoc.StartsWith("data:image/") && !rentalLicenseDoc.StartsWith("https://"))
                return "Licence document must be an uploaded image.";
        }
        return null;
    }

    public sealed record BookingInput(string CarId, string StartDate, string EndDate, string DriveMode,
        string? DriverName, string? DriverLicenseNumber, string? DriverLicenseImage);

    public static string? Booking(BookingInput v)
    {
        if (string.IsNullOrEmpty(v.CarId)) return "Invalid input.";
        if (v.StartDate == null || !Regex.IsMatch(v.StartDate, @"^\d{4}-\d{2}-\d{2}$")) return "Choose a start date.";
        if (v.EndDate == null || !Regex.IsMatch(v.EndDate, @"^\d{4}-\d{2}-\d{2}$")) return "Choose a return date.";
        if (v.DriveMode is not ("SELF_DRIVE" or "OWN_DRIVER" or "OWNER_DRIVER")) return "Invalid enum value.";
        if (v.DriverName is { Length: > 80 }) return "Driver name is too long.";
        if (v.DriverLicenseNumber is { Length: > 40 }) return "Licence number is too long.";
        if (v.DriverLicenseImage is { Length: > 3_000_000 }) return "Licence photo is too large — pick a smaller file.";
        if (v.DriverLicenseImage is { Length: > 0 } img && !img.StartsWith("data:image/") && !img.StartsWith("https://"))
            return "Licence photo must be an uploaded image.";

        // Conditional rules (superRefine) — same order as zod.
        if (v.DriveMode == "SELF_DRIVE")
        {
            if (string.IsNullOrEmpty(v.DriverLicenseNumber) || v.DriverLicenseNumber.Length < 4)
                return "Enter your driving licence number (at least 4 characters).";
            if (string.IsNullOrEmpty(v.DriverLicenseImage) || v.DriverLicenseImage.Length < 50)
                return "Upload a photo of your driving licence.";
        }
        if (v.DriveMode == "OWN_DRIVER")
        {
            if (string.IsNullOrEmpty(v.DriverName) || v.DriverName.Length < 2)
                return "Enter the full name of the driver you are bringing.";
            if (string.IsNullOrEmpty(v.DriverLicenseNumber) || v.DriverLicenseNumber.Length < 4)
                return "Enter your driver's licence number (at least 4 characters).";
            if (string.IsNullOrEmpty(v.DriverLicenseImage) || v.DriverLicenseImage.Length < 50)
                return "Upload a photo of your driver's licence.";
        }
        return null;
    }

    public static string? Review(string? bookingId, string? ratingRaw, string? comment)
    {
        if (string.IsNullOrEmpty(bookingId)) return "Invalid input.";
        if (!int.TryParse(ratingRaw, out var rating) || rating < 1 || rating > 5) return "Pick a rating from 1 to 5.";
        if (comment == null || comment.Length < 5) return "Tell others a bit more (at least 5 characters).";
        if (comment.Length > 1000) return "Tell others a bit more (at least 5 characters).";
        return null;
    }

    public static string? Reply(string? reviewId, string? reply)
    {
        if (string.IsNullOrEmpty(reviewId)) return "Invalid input.";
        if (reply == null || reply.Length < 3) return "Reply must be at least 3 characters.";
        if (reply.Length > 500) return "Reply must be at least 3 characters.";
        return null;
    }

    public sealed record CarInput(string Make, string Model, string? YearRaw, string Transmission, string FuelType,
        string? SeatsRaw, string City, string Neighbourhood, string? PriceRaw, string Description,
        List<string> Photos, string? ValuationDoc, string? ValuationAmountRaw, string? DriverFeeRaw);

    public static string? Car(CarInput v)
    {
        if (v.Make == null || v.Make.Length < 2) return "Make is required.";
        if (string.IsNullOrEmpty(v.Model)) return "Model is required.";
        if (!int.TryParse(v.YearRaw, out var year) || year < 1990) return "Year must be 1990 or later.";
        if (year > DateTime.UtcNow.Year + 1) return "Year must be 1990 or later.";
        if (v.Transmission is not ("AUTOMATIC" or "MANUAL")) return "Invalid enum value.";
        if (v.FuelType is not ("PETROL" or "DIESEL" or "HYBRID" or "ELECTRIC")) return "Invalid enum value.";
        if (!int.TryParse(v.SeatsRaw, out var seats) || seats < 2 || seats > 9) return "Number must be less than or equal to 9";
        if (v.City != null && v.City.Length < 2) return "String must contain at least 2 character(s)";
        if (v.Neighbourhood == null || v.Neighbourhood.Length < 2) return "Neighbourhood is required.";
        if (!int.TryParse(v.PriceRaw, out var price) || price < 500) return "Price must be at least ETB 500/day.";
        if (price > 100000) return "Number must be less than or equal to 100000";
        if (v.Description == null || v.Description.Length < 20) return "Describe the car in at least 20 characters.";
        if (v.Description.Length > 2000) return "Describe the car in at least 20 characters.";

        if (v.Photos.Count < 1) return "Add at least one photo.";
        if (v.Photos.Count > 5) return "A car can have at most 5 photos.";
        foreach (var p in v.Photos)
        {
            if (p.Length > 3_000_000) return "One of the photos is too large — please use a smaller image.";
            var httpsOk = Regex.IsMatch(p, @"^https://\S+$");
            var dataOk = Regex.IsMatch(p, @"^data:image/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$");
            if (!httpsOk && !dataOk) return "Each photo must be an https image link or an uploaded photo.";
        }

        var valuationDoc = v.ValuationDoc ?? "";
        if (valuationDoc.Length < 50) return "Upload the technical valuation report — a photo or scan of the document.";
        if (valuationDoc.Length > 3_000_000) return "Valuation document is too large — pick a smaller image.";
        if (!valuationDoc.StartsWith("data:image/") && !valuationDoc.StartsWith("https://"))
            return "Valuation document must be an uploaded image.";

        // valuationAmount: optional; validated when given
        if (!string.IsNullOrWhiteSpace(v.ValuationAmountRaw))
        {
            if (!int.TryParse(v.ValuationAmountRaw, out var amount)) return "Market value must be a whole number of ETB.";
            if (amount < 0) return "Market value cannot be negative.";
            if (amount > 100_000_000) return "Market value looks too large — check the digits.";
        }
        // driverFeePerDay: optional; validated when given
        if (!string.IsNullOrWhiteSpace(v.DriverFeeRaw))
        {
            if (!int.TryParse(v.DriverFeeRaw, out var fee)) return "Driver fee must be a whole number of ETB.";
            if (fee < 100) return "If you offer a driver, the fee must be at least ETB 100/day.";
            if (fee > 50_000) return "Driver fee looks too large — check the digits.";
        }
        return null;
    }

    public static string? Dispute(string? bookingId, string? reason)
    {
        if (string.IsNullOrEmpty(bookingId)) return "Invalid input.";
        if (reason == null || reason.Length < 15) return "Explain the issue in at least 15 characters.";
        if (reason.Length > 1000) return "Explain the issue in at least 15 characters.";
        return null;
    }

    public static string? ResolveDispute(string? disputeId, string? notes)
    {
        if (string.IsNullOrEmpty(disputeId)) return "Invalid input.";
        if (notes == null || notes.Length < 10) return "Record resolution notes (at least 10 characters).";
        if (notes.Length > 1000) return "Record resolution notes (at least 10 characters).";
        return null;
    }

    public static string? Announcement(string? title, string? body)
    {
        if (title == null || title.Length < 4) return "Title must be at least 4 characters.";
        if (title.Length > 120) return "Title must be at least 4 characters.";
        if (body == null || body.Length < 10) return "Body must be at least 10 characters.";
        if (body.Length > 1000) return "Body must be at least 10 characters.";
        return null;
    }

    public static string? Payment(string? bookingId, string? method, string? contact)
    {
        if (string.IsNullOrEmpty(bookingId)) return "Invalid input.";
        if (method is not ("telebirr" or "cbebirr" or "mpesa" or "chapa")) return "Invalid enum value.";
        var trimmed = contact?.Trim() ?? "";
        if (trimmed.Length < 5) return "Enter your payment contact details.";
        if (trimmed.Length > 60) return "Enter your payment contact details.";
        var phone = Regex.Replace(trimmed, @"[\s\-()]", "");
        var isPhone = Regex.IsMatch(phone, @"^(\+251|0)?9\d{8}$");
        if (method == "chapa")
        {
            var isEmail = Regex.IsMatch(trimmed, @"^[^\s@]+@[^\s@]+\.[^\s@]+$");
            if (!isPhone && !isEmail) return "Enter the email or mobile number registered with Chapa.";
        }
        else if (!isPhone)
        {
            return "Enter a valid Ethiopian mobile number (09xxxxxxxx).";
        }
        return null;
    }

    private static bool IsEmail(string s) => Regex.IsMatch(s, @"^[^\s@]+@[^\s@]+\.[^\s@]+$");
}
