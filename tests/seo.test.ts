import { describe, expect, it } from "vitest";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as aboutMetadata } from "@/app/about/page";
import { metadata as privacyMetadata } from "@/app/privacy/page";
import { metadata as termsMetadata } from "@/app/terms/page";
import { metadata as pricingMetadata } from "@/app/pricing/page";
import { metadata as refundsMetadata } from "@/app/refunds/page";
import { metadata as contactMetadata } from "@/app/contact/page";
import robots, { buildRobots } from "@/app/robots";
import sitemap, { buildSitemap } from "@/app/sitemap";
import { metadata as privateSessionMetadata } from "@/app/study/[sessionId]/layout";
import { metadata as demoMetadata } from "@/app/study/demo/layout";
import { metadata as authMetadata } from "@/app/auth/page";
import { metadata as accountMetadata } from "@/app/account/page";
import { metadata as myGuidesMetadata } from "@/app/my-guides/page";
import { metadata as libraryMetadata } from "@/app/library/page";
import { metadata as searchMetadata } from "@/app/search/page";
import { metadata as profileMetadata } from "@/app/profile/page";
import { getPublicRobots, getSiteUrl, isPrelaunch } from "@/lib/site";

describe("Study route indexing guardrails", () => {
  it("marks private Study sessions noindex, nofollow", () => {
    expect(privateSessionMetadata.robots).toEqual(expect.objectContaining({
      index: false,
      follow: false,
    }));
  });

  it("marks the demo noindex, nofollow", () => {
    expect(demoMetadata.robots).toEqual(expect.objectContaining({
      index: false,
      follow: false,
    }));
  });

  it("keeps auth and account routes private and noindex", () => {
    expect(authMetadata.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
    expect(accountMetadata.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
    expect(myGuidesMetadata.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
    expect(libraryMetadata.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
    expect(searchMetadata.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
    expect(profileMetadata.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
  });
});

describe("Public SEO routes", () => {
  it("fails closed unless production indexing is explicitly enabled", () => {
    expect(isPrelaunch({})).toBe(true);
    expect(isPrelaunch({ PRELAUNCH: "true", VERCEL_ENV: "production" })).toBe(true);
    expect(isPrelaunch({ PRELAUNCH: "false", VERCEL_ENV: "preview" })).toBe(true);
    expect(isPrelaunch({ PRELAUNCH: "false", VERCEL_ENV: "production" })).toBe(false);
    expect(getPublicRobots({ PRELAUNCH: "true", VERCEL_ENV: "production" })).toEqual({
      index: false,
      follow: false,
    });
  });

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
    expect(pricingMetadata.alternates).toEqual(expect.objectContaining({ canonical: "/pricing" }));
    expect(refundsMetadata.alternates).toEqual(expect.objectContaining({ canonical: "/refunds" }));
    expect(contactMetadata.alternates).toEqual(expect.objectContaining({ canonical: "/contact" }));
  });

  it("keeps private and API routes out of crawler access", () => {
    const output = robots();
    expect(output.rules).toEqual(expect.objectContaining({
      userAgent: "*",
      allow: ["/", "/study/demo"],
      disallow: ["/api/", "/study/"],
    }));
    expect(output.sitemap).toBeUndefined();

    const launchOutput = buildRobots({ PRELAUNCH: "false", VERCEL_ENV: "production" });
    expect(launchOutput.sitemap).toBe("http://localhost:3000/sitemap.xml");
  });

  it("publishes no discovery URLs before launch", () => {
    expect(sitemap()).toEqual([]);
  });

  it("lists only public, indexable pages after launch", () => {
    const paths = buildSitemap({ PRELAUNCH: "false", VERCEL_ENV: "production" })
      .map((entry) => new URL(entry.url).pathname);
    expect(paths).toEqual(["/", "/about", "/privacy", "/terms", "/pricing", "/refunds", "/contact"]);
    expect(paths.some((path) => path.startsWith("/study/") || path.startsWith("/api/"))).toBe(false);
  });
});
