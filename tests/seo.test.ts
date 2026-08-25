import { describe, expect, it } from "vitest";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as aboutMetadata } from "@/app/about/page";
import { metadata as privacyMetadata } from "@/app/privacy/page";
import { metadata as termsMetadata } from "@/app/terms/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { metadata as privateSessionMetadata } from "@/app/study/[sessionId]/layout";
import { metadata as demoMetadata } from "@/app/study/demo/layout";
import { getSiteUrl } from "@/lib/site";

describe("Study route indexing guardrails", () => {
  it("marks private Study sessions noindex, nofollow", () => {
    expect(privateSessionMetadata.robots).toEqual(expect.objectContaining({
      index: false,
      follow: false,
    }));
  });

  it("marks the demo noindex while allowing link following", () => {
    expect(demoMetadata.robots).toEqual(expect.objectContaining({
      index: false,
      follow: true,
    }));
  });
});

describe("Public SEO routes", () => {
  it("defines a metadata base and canonical homepage metadata", () => {
    expect(getSiteUrl().toString()).toBe("http://localhost:3000/");
    expect(homeMetadata.alternates).toEqual(expect.objectContaining({ canonical: "/" }));
    expect(homeMetadata.openGraph).toEqual(expect.objectContaining({ type: "website", url: "/" }));
    expect(homeMetadata.twitter).toEqual(expect.objectContaining({ card: "summary_large_image" }));
  });

  it("gives every public trust page its own canonical", () => {
    expect(aboutMetadata.alternates).toEqual(expect.objectContaining({ canonical: "/about" }));
    expect(privacyMetadata.alternates).toEqual(expect.objectContaining({ canonical: "/privacy" }));
    expect(termsMetadata.alternates).toEqual(expect.objectContaining({ canonical: "/terms" }));
  });

  it("keeps private and API routes out of crawler access", () => {
    const output = robots();
    expect(output.rules).toEqual(expect.objectContaining({
      userAgent: "*",
      allow: ["/", "/study/demo"],
      disallow: ["/api/", "/study/"],
    }));
    expect(output.sitemap).toBe("http://localhost:3000/sitemap.xml");
  });

  it("lists only public, indexable pages in the sitemap", () => {
    const paths = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(paths).toEqual(["/", "/about", "/privacy", "/terms"]);
    expect(paths.some((path) => path.startsWith("/study/") || path.startsWith("/api/"))).toBe(false);
  });
});
