import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/organizer",
        "/api",
        "/account",
        "/auth",
        "/booking",
        "/food",
        "/tickets",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
