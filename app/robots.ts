import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/study/demo"],
      disallow: ["/api/", "/study/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
