import type { MetadataRoute } from "next";
import { apiGet } from "@/lib/api";
import { site, siteUrl } from "@/lib/site";

export const revalidate = 3600; // refresh at most hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/cars"), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: siteUrl("/signin"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: siteUrl("/signup"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const { cars } = await apiGet<{ cars: { id: string; updatedAt: Date }[] }>("/api/view/sitemap-cars");
    return [
      ...statics,
      ...cars.map((c) => ({
        url: siteUrl(`/cars/${c.id}`),
        lastModified: c.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // Build-time cold start (no DB reachable yet): publish the static skeleton.
    return statics;
  }
}
