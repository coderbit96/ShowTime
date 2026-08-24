import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return (await getSitemapEntries()).map((entry) => ({
    changeFrequency: "daily",
    ...entry,
  }));
}
