import type { Metadata } from "next";
import { absoluteUrl, getPublicRobots, SITE_NAME } from "@/lib/site";

type PublicPage = {
  title: string;
  description: string;
  path: string;
};

export function publicPageMetadata({ title, description, path }: PublicPage): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title: { absolute: fullTitle },
    description,
    robots: getPublicRobots(),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Folveta - turn PDFs and slides into a clear Study Guide" }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [{ url: "/twitter-image", alt: "Folveta - source-grounded guides from PDFs and slides" }],
    },
  };
}

export function publicPageSchema(
  page: PublicPage,
  pageType: "WebPage" | "AboutPage" = "WebPage",
) {
  const url = absoluteUrl(page.path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": pageType,
        "@id": `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: "en",
        isPartOf: { "@id": absoluteUrl("/#website") },
        about: { "@id": absoluteUrl("/#application") },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Folveta", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: page.title, item: url },
        ],
      },
    ],
  };
}
