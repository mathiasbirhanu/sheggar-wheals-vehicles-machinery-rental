// Cuid — a Prisma-compatible id generator. New rows need string ids shaped
// like the ones Prisma produced ('c' + base36 timestamp + random, 25 chars).
// Uniqueness is what matters; the exact tail differs from Prisma's, which is
// invisible to the app (ids are opaque strings everywhere).
using System.Security.Cryptography;
using System.Text;

namespace SheggarWheels.Api.Infrastructure;

public static class Cuid
{
    private static long _lastTime = -1;
    private static int _counter;

    public static string New()
    {
        var time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (time == Interlocked.Read(ref _lastTime))
        {
            var c = Interlocked.Increment(ref _counter);
            var suffix = RandomBytes(8);
            return 'c' + Base36(time) + Base36Padded(c) + Hex(suffix)[..8];
        }
        Interlocked.Exchange(ref _lastTime, time);
        Interlocked.Exchange(ref _counter, 0);
        return 'c' + Base36(time) + Hex(RandomBytes(9));
    }

    private static string Base36(long v)
    {
        const string chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        if (v == 0) return "0";
        var sb = new StringBuilder();
        while (v > 0) { sb.Insert(0, chars[(int)(v % 36)]); v /= 36; }
        return sb.ToString();
    }

    private static string Base36Padded(int v) => Base36(v).PadLeft(3, '0');

    private static byte[] RandomBytes(int n)
    {
        var b = new byte[n];
        RandomNumberGenerator.Fill(b);
        return b;
    }

    private static string Hex(byte[] bytes) => Convert.ToHexString(bytes).ToLowerInvariant();
}
