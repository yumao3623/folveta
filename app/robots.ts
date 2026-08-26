import type { MetadataRoute } from "next";
import { absoluteUrl, isPrelaunch, type IndexingEnvironment } from "@/lib/site";

export function buildRobots(
  environment: IndexingEnvironment = process.env,
): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/study/demo"],
      disallow: ["/api/", "/study/"],
    },
    ...(!isPrelaunch(environment) && {
      sitemap: absoluteUrl("/sitemap.xml"),
    }),
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
