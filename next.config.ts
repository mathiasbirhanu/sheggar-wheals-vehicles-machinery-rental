import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy (NFR security): locked down for production, relaxed in
// dev because Turbopack HMR requires eval. Next.js injects inline bootstrap
// scripts, and Radix/Framer emit inline styles, hence the two unsafe-* tokens.
// img-src: 'data:' serves device-uploaded photos (stored as data URLs, FR-34),
// 'blob:' covers local previews, 'https:' allows any https image link an owner
// pastes (online-link photos must load, not fall back).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Self-contained server for Docker / any Node host (see Dockerfile).
  output: "standalone",
  // Industry grade: type errors fail the build, strict mode surfaces lifecycle bugs.
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
  poweredByHeader: false,
  // C# BACKEND PROXY: when BACKEND_URL is set, every /api/* request (browser
  // fetches, CSV downloads, the Google OAuth round-trip) is forwarded to the
  // ASP.NET Core API. Cookies flow through the proxy unchanged — same origin
  // from the browser's point of view. Without BACKEND_URL nothing changes.
  async rewrites() {
    const backend = process.env.BACKEND_URL;
    if (!backend) return [];
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  images: {
    // FR-34: owners may paste an image link from ANY https site, so the optimizer
    // accepts every https hostname ('**'). data:/blob: URLs bypass the optimizer.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
  },
  // Device uploads travel inside the server-action body as base64 data URLs
  // (5 photos x ~350 KB after browser-side resizing). The 1 MB default would
  // reject the whole form, so raise the ceiling with headroom.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/api/health", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
