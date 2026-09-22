import type { MetadataRoute } from "next";
import { absoluteUrl, isPrelaunch, PUBLIC_PAGE_PATHS, PUBLIC_PAGE_MODIFIED, type IndexingEnvironment } from "@/lib/site";

export function buildSitemap(
  environment: IndexingEnvironment = process.env,
): MetadataRoute.Sitemap {
  if (isPrelaunch(environment)) return [];

  return PUBLIC_PAGE_PATHS.map((path) => ({
    url: absoluteUrl(path, environment),
    ...(PUBLIC_PAGE_MODIFIED[path] ? { lastModified: PUBLIC_PAGE_MODIFIED[path] } : {}),
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
