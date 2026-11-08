// In-memory sliding-window rate limiter — port of src/lib/rate-limit.ts.
// Keyed by scope + client IP; sized for a single-node deployment. Every
// rejection is logged as a structured warning so abuse leaves an audit trail.
namespace SheggarWheels.Api.Services;

public record RateResult(bool Ok, int RetryAfterSec);

public class RateLimiter
{
    private sealed class Bucket { public int Count; public long ResetAt; }

    private readonly Dictionary<string, Bucket> _buckets = new();
    private const int MaxBuckets = 10_000;
    private readonly ILogger<RateLimiter> _logger;
    private readonly object _lock = new();

    public RateLimiter(ILogger<RateLimiter> logger) => _logger = logger;

    /// <summary>Consume one token for `key`. Returns ok=false with a retry hint once the limit is exceeded.</summary>
    public RateResult Check(string key, int limit, int windowMs)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        lock (_lock)
        {
            if (_buckets.TryGetValue(key, out var entry) && entry.ResetAt <= now)
                _buckets.Remove(key);

            if (!_buckets.ContainsKey(key))
            {
                if (_buckets.Count >= MaxBuckets) Prune(now);
                _buckets[key] = new Bucket { Count = 1, ResetAt = now + windowMs };
                return new RateResult(true, 0);
            }
            entry = _buckets[key];
            entry.Count += 1;
            if (entry.Count > limit)
            {
                var retryAfterSec = Math.Max(1, (int)Math.Ceiling((entry.ResetAt - now) / 1000.0));
                var colon = key.IndexOf(':');
                var (scope, ip) = colon >= 0 ? (key[..colon], key[(colon + 1)..]) : (key, "unknown");
                _logger.LogWarning("rate limit exceeded {Scope} {Ip} retryAfterSec {Retry}", scope, ip, retryAfterSec);
                return new RateResult(false, retryAfterSec);
            }
            return new RateResult(true, 0);
        }
    }

    private void Prune(long now)
    {
        foreach (var k in _buckets.Where(kv => kv.Value.ResetAt <= now).Select(kv => kv.Key).ToList())
            _buckets.Remove(k);
    }
}
