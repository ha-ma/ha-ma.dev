import type { MetadataRoute } from "next";
import { getDailyIndex } from "@/lib/daily/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ha-ma.dev";
  const { days } = await getDailyIndex(1, 200);
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/daily`, changeFrequency: "daily", priority: 0.8, lastModified: days[0]?.lastUpdated ? new Date(days[0].lastUpdated) : undefined },
    ...days.map((d) => ({ url: `${base}/daily/${d.date}`, lastModified: new Date(d.lastUpdated), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
