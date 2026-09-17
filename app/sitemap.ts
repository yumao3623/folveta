import type { MetadataRoute } from "next";
import { absoluteUrl, isPrelaunch, type IndexingEnvironment } from "@/lib/site";

export function buildSitemap(
  environment: IndexingEnvironment = process.env,
): MetadataRoute.Sitemap {
  if (isPrelaunch(environment)) return [];

  return [
    {
      url: absoluteUrl("/", environment),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/about", environment),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/privacy", environment),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/terms", environment),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/pricing", environment),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/study-guide-maker-from-pdf", environment),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/how-to-make-a-study-guide", environment),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/refunds", environment),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/contact", environment),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
