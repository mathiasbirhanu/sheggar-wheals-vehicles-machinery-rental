// Sheggar Wheels API — Program.cs
// ASP.NET Core 8 replacement for the Next.js backend (server actions + API
// routes + Prisma). Same database, same rules, same JSON shapes.
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Npgsql.NameTranslation;
using SheggarWheels.Api.Auth;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Entities;
using SheggarWheels.Api.Data;
using SheggarWheels.Api.Infrastructure;
using SheggarWheels.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Prisma compatibility: the schema stores DateTime as `timestamp without time
// zone` holding the UTC wall-clock (Prisma's convention). The legacy Npgsql
// timestamp behaviour accepts DateTime in any Kind for those columns — the
// modern strict mode rejects Kind=Utc for `timestamp` and is designed for
// timestamptz-first schemas. This switch matches Prisma's semantics 1:1.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// ── Port: Render injects PORT; local dev defaults to 5000 ──────────────────
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ── Database: the SAME Supabase Postgres the Prisma schema created ─────────
var databaseUrl =
    Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("DATABASE_URL is not configured");
// Normalise postgres:// → postgresql:// (some dashboards emit the short scheme).
if (databaseUrl.StartsWith("postgres://", StringComparison.Ordinal))
    databaseUrl = "postgresql://" + databaseUrl["postgres://".Length..];
// PostgreSQL enums — Prisma created them with PascalCase names/labels. The
// ADO-level MapEnum (with a null name translator) wires the CLR ↔ PG mapping
// for SCALARS and ARRAYS (e.g. User.roles is a native "Role"[] column).
var enumTranslator = new NpgsqlNullNameTranslator();
var dataSourceBuilder = new NpgsqlDataSourceBuilder(databaseUrl);
dataSourceBuilder.MapEnum<Role>("Role", enumTranslator);
dataSourceBuilder.MapEnum<UserStatus>("UserStatus", enumTranslator);
dataSourceBuilder.MapEnum<CarStatus>("CarStatus", enumTranslator);
dataSourceBuilder.MapEnum<Transmission>("Transmission", enumTranslator);
dataSourceBuilder.MapEnum<FuelType>("FuelType", enumTranslator);
dataSourceBuilder.MapEnum<BookingStatus>("BookingStatus", enumTranslator);
dataSourceBuilder.MapEnum<PaymentStatus>("PaymentStatus", enumTranslator);
dataSourceBuilder.MapEnum<LicenseStatus>("LicenseStatus", enumTranslator);
dataSourceBuilder.MapEnum<DriveMode>("DriveMode", enumTranslator);
dataSourceBuilder.MapEnum<DisputeStatus>("DisputeStatus", enumTranslator);
dataSourceBuilder.MapEnum<AnnouncementKind>("AnnouncementKind", enumTranslator);
var dataSource = dataSourceBuilder.Build();
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(dataSource));

// ── MVC controllers with Prisma-compatible JSON (camelCase, ISO-UTC dates) ─
builder.Services.AddControllers().AddJsonOptions(options =>
{
    foreach (var conv in Json.Options.Converters) options.JsonSerializerOptions.Converters.Add(conv);
    options.JsonSerializerOptions.PropertyNamingPolicy = Json.Options.PropertyNamingPolicy;
    options.JsonSerializerOptions.DictionaryKeyPolicy = Json.Options.DictionaryKeyPolicy;
    options.JsonSerializerOptions.ReferenceHandler = Json.Options.ReferenceHandler;
    options.JsonSerializerOptions.DefaultIgnoreCondition = Json.Options.DefaultIgnoreCondition;
    options.JsonSerializerOptions.Encoder = Json.Options.Encoder;
});

// ── Application services ───────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddScoped<Notifications>();
builder.Services.AddScoped<SeedService>();
builder.Services.AddSingleton<RateLimiter>();
builder.Services.AddSingleton<GoogleOAuth>();
builder.Services.AddHttpClient("google");

// ── CORS: only needed for DIRECT browser calls (local dev without the Next.js
//    proxy). Behind the Vercel rewrite, requests are same-origin anyway.
builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy
    .WithOrigins("http://localhost:3000", builder.Configuration["FRONTEND_ORIGIN"] ?? "http://localhost:3000")
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

// ── Guard exceptions → the same semantics the Next.js guards had ───────────
// unauthenticated → 401 (thin action redirects to /signin), suspended → 403
// (→ /suspended), missing role → 403 (→ home). Lifecycle violations → 400.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (ApiGuardException ex)
    {
        context.Response.StatusCode = ex.Code switch
        {
            GuardCode.Unauthenticated => StatusCodes.Status401Unauthorized,
            _ => StatusCodes.Status403Forbidden,
        };
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(Json.Serialize(new
        {
            error = "You are not allowed to perform this action.",
            code = ex.Code.ToString(),
        }));
    }
    catch (LifecycleException ex)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(Json.Serialize(new { error = ex.Message }));
    }
});

app.UseCors("frontend");
app.MapControllers();

// Boot warnings — mirror auth.ts loud misconfiguration logging.
if (CurrentUser.UsingFallbackSecret && app.Environment.IsProduction())
    app.Logger.LogError("[sheggar-wheels] BOOT: SESSION_SECRET is not set — session endpoints will refuse to operate in production.");

app.Logger.LogInformation("Sheggar Wheels API (C#/.NET) listening on port {Port}", port);
app.Run();
