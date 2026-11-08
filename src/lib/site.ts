// Central brand/site configuration — single source of truth for SEO surfaces
// (metadata, sitemap, robots, manifest, Open Graph, JSON-LD).
export const site = {
  name: "Sheggar Wheels",
  tagline: "Rent a car from people you trust",
  description:
    "Sheggar Wheels is a peer-to-peer car rental marketplace for Addis Ababa. Browse verified local cars, book with escrow-protected payments, and pay safely. Capstone demo with seeded data.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",
  area: "Addis Ababa, Ethiopia",
  supportEmail: "support@sheggarwheels.et",
  version: "1.0.0",
} as const;

/** Absolute URL joiner that tolerates leading/trailing slashes. */
export function siteUrl(path = "/"): string {
  return new URL(path, site.url).toString();
}
