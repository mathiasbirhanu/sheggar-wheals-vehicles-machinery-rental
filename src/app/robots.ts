import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private, transactional, and admin surfaces out of indexes.
        disallow: ["/admin", "/owner", "/dashboard", "/bookings", "/checkout", "/notifications", "/api", "/signin", "/signup", "/suspended"],
      },
    ],
    sitemap: new URL("/sitemap.xml", site.url).toString(),
    host: site.url,
  };
}
