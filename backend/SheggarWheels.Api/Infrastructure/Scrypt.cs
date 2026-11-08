// scrypt password hashing (RFC 7914) — dependency-free C# implementation that is
// BYTE-COMPATIBLE with Node's crypto.scrypt, which created every existing password
// hash in the database. Storage format (identical to src/lib/password.ts):
//
//   scrypt$N=16384$r=8$p=1$<salt hex 16B>$<hash hex 64B>
//
// Pipeline (RFC 7914): B = PBKDF2-HMAC-SHA256(P, S, 1, p*128*r) → ROMix each
// 128*r-byte chunk → DK = PBKDF2-HMAC-SHA256(P, B, 1, dkLen).
// Verified against RFC 7914 test vectors #1 and #3 (i.e. OpenSSL / Node output).
using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace SheggarWheels.Api.Infrastructure;

public static class Scrypt
{
    public const int DefaultN = 16384, DefaultR = 8, DefaultP = 1, DefaultKeyLen = 64;

    /// <summary>Hash a plaintext password into the storable self-describing string.</summary>
    public static string HashPassword(string plain)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Derive(Encoding.UTF8.GetBytes(plain), salt, DefaultN, DefaultR, DefaultP, DefaultKeyLen);
        return $"scrypt$N={DefaultN}$r={DefaultR}$p={DefaultP}${Convert.ToHexString(salt).ToLowerInvariant()}${Convert.ToHexString(hash).ToLowerInvariant()}";
    }

    /// <summary>Constant-time verification. Returns false for null/malformed hashes.</summary>
    public static bool VerifyPassword(string plain, string? stored)
    {
        if (string.IsNullOrEmpty(stored)) return false;
        var parts = stored.Split('$');
        if (parts.Length != 6 || parts[0] != "scrypt") return false;
        if (!TryParseParam(parts[1], "N", out var n) || !TryParseParam(parts[2], "r", out var r) || !TryParseParam(parts[3], "p", out var p)) return false;
        if (n <= 1 || r <= 0 || p <= 0 || (n & (n - 1)) != 0) return false;
        try
        {
            var salt = Convert.FromHexString(parts[4]);
            var expected = Convert.FromHexString(parts[5]);
            var actual = Derive(Encoding.UTF8.GetBytes(plain), salt, n, r, p, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch
        {
            return false;
        }
    }

    private static bool TryParseParam(string segment, string name, out int value)
    {
        value = 0;
        if (!segment.StartsWith(name + "=", StringComparison.Ordinal)) return false;
        return int.TryParse(segment.AsSpan(name.Length + 1), out value) && value > 0;
    }

    /// <summary>The scrypt KDF (RFC 7914) — matches Node crypto.scrypt output exactly.</summary>
    public static byte[] Derive(byte[] password, byte[] salt, int n, int r, int p, int dkLen)
    {
        var blockLen = 128 * r;
        var b = Rfc2898DeriveBytes.Pbkdf2(password, salt, 1, HashAlgorithmName.SHA256, p * blockLen);
        for (var i = 0; i < p; i++)
        {
            var chunk = b.AsSpan(i * blockLen, blockLen);
            Romix(chunk, n, r);
        }
        return Rfc2898DeriveBytes.Pbkdf2(password, b, 1, HashAlgorithmName.SHA256, dkLen);
    }

    // ── ROMix ────────────────────────────────────────────────────────────────
    private static void Romix(Span<byte> block, int n, int r)
    {
        var blockLen = 128 * r;
        var v = new byte[n * blockLen];
        var x = new byte[blockLen];
        block.CopyTo(x);

        // Pass 1: V[i] = X; X = BlockMix(X)
        for (var i = 0; i < n; i++)
        {
            x.CopyTo(v.AsSpan(i * blockLen, blockLen));
            BlockMix(x, r);
        }
        // Pass 2: j = Integerify(X) mod N — the first 32-bit LE word of the LAST
        // 64-byte chunk of X; X = BlockMix(X XOR V[j]).
        var last = (2 * r - 1) * 64;
        for (var i = 0; i < n; i++)
        {
            var j = (int)(BinaryPrimitives.ReadUInt32LittleEndian(x.AsSpan(last)) % (uint)n);
            for (var k = 0; k < blockLen; k++) x[k] ^= v[j * blockLen + k];
            BlockMix(x, r);
        }
        x.CopyTo(block);
    }

    // ── BlockMix ─────────────────────────────────────────────────────────────
    private static void BlockMix(byte[] b, int r)
    {
        var chunks = 2 * r;
        var x = new byte[64];
        var y = new byte[chunks * 64];
        var t = new byte[64];
        Array.Copy(b, (chunks - 1) * 64, x, 0, 64);

        for (var i = 0; i < chunks; i++)
        {
            for (var k = 0; k < 64; k++) t[k] = (byte)(x[k] ^ b[i * 64 + k]);
            Salsa208(t, x);
            Array.Copy(x, 0, y, i * 64, 64);
        }
        // Interleave: even chunks first, then odd chunks.
        for (var i = 0; i < r; i++) Array.Copy(y, i * 2 * 64, b, i * 64, 64);
        for (var i = 0; i < r; i++) Array.Copy(y, (i * 2 + 1) * 64, b, (r + i) * 64, 64);
    }

    // ── Salsa20/8 core ───────────────────────────────────────────────────────
    private static void Salsa208(byte[] input, byte[] output)
    {
        var x = new uint[16];
        for (var i = 0; i < 16; i++) x[i] = BinaryPrimitives.ReadUInt32LittleEndian(input.AsSpan(i * 4));
        var orig = (uint[])x.Clone();

        for (var round = 0; round < 4; round++) // 4 double rounds = 8 rounds
        {
            // Column round
            x[4] ^= Rotl(x[0] + x[12], 7);
            x[8] ^= Rotl(x[4] + x[0], 9);
            x[12] ^= Rotl(x[8] + x[4], 13);
            x[0] ^= Rotl(x[12] + x[8], 18);
            x[9] ^= Rotl(x[5] + x[1], 7);
            x[13] ^= Rotl(x[9] + x[5], 9);
            x[1] ^= Rotl(x[13] + x[9], 13);
            x[5] ^= Rotl(x[1] + x[13], 18);
            x[14] ^= Rotl(x[10] + x[6], 7);
            x[2] ^= Rotl(x[14] + x[10], 9);
            x[6] ^= Rotl(x[2] + x[14], 13);
            x[10] ^= Rotl(x[6] + x[2], 18);
            x[3] ^= Rotl(x[15] + x[11], 7);
            x[7] ^= Rotl(x[3] + x[15], 9);
            x[11] ^= Rotl(x[7] + x[3], 13);
            x[15] ^= Rotl(x[11] + x[7], 18);
            // Row round
            x[1] ^= Rotl(x[0] + x[3], 7);
            x[2] ^= Rotl(x[1] + x[0], 9);
            x[3] ^= Rotl(x[2] + x[1], 13);
            x[0] ^= Rotl(x[3] + x[2], 18);
            x[6] ^= Rotl(x[5] + x[4], 7);
            x[7] ^= Rotl(x[6] + x[5], 9);
            x[4] ^= Rotl(x[7] + x[6], 13);
            x[5] ^= Rotl(x[4] + x[7], 18);
            x[11] ^= Rotl(x[10] + x[9], 7);
            x[8] ^= Rotl(x[11] + x[10], 9);
            x[9] ^= Rotl(x[8] + x[11], 13);
            x[10] ^= Rotl(x[9] + x[8], 18);
            x[12] ^= Rotl(x[15] + x[14], 7);
            x[13] ^= Rotl(x[12] + x[15], 9);
            x[14] ^= Rotl(x[13] + x[12], 13);
            x[15] ^= Rotl(x[14] + x[13], 18);
        }
        for (var i = 0; i < 16; i++)
            BinaryPrimitives.WriteUInt32LittleEndian(output.AsSpan(i * 4), x[i] + orig[i]);
    }

    private static uint Rotl(uint v, int c) => (v << c) | (v >> (32 - c));
}
