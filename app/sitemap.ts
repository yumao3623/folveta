import type { MetadataRoute } from "next";
import { absoluteUrl, isPrelaunch, type IndexingEnvironment } from "@/lib/site";

export function buildSitemap(
  environment: IndexingEnvironment = process.env,
): MetadataRoute.Sitemap {
  if (isPrelaunch(environment)) return [];

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/about"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/privacy"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/terms"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/pricing"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/refunds"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
