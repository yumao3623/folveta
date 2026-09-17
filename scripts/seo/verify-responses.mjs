import assert from "node:assert/strict";

// Run against a production build or the deployed site, not `next dev`.
const base = process.env.SEO_BASE_URL ?? "http://127.0.0.1:3122";
const canonicalOrigin = "https://folveta.com";
const paths = ["/", "/about", "/privacy", "/terms", "/pricing", "/study-guide-maker-from-pdf", "/how-to-make-a-study-guide", "/refunds", "/contact"];
const summaries = [];
const titles = new Set();
const descriptions = new Set();

const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
const meta = (html, key) => [...html.matchAll(/<meta\s[^>]*>/g)].map(([tag]) => attributes(tag)).filter((tag) => tag.name === key || tag.property === key).map((tag) => tag.content);
const canonical = (html) => [...html.matchAll(/<link\s[^>]*>/g)].map(([tag]) => attributes(tag)).filter((tag) => tag.rel === "canonical").map((tag) => tag.href);
const read = async (pathname, headers) => {
  const response = await fetch(new URL(pathname, base), { redirect: "manual", headers, signal: AbortSignal.timeout(30000) });
  return { response, html: await response.text() };
};

for (const pathname of paths) {
  const { response, html } = await read(pathname);
  assert.equal(response.status, 200, pathname);
  assert.equal(response.headers.get("set-cookie"), null, `${pathname} must not personalize public HTML`);
  assert.doesNotMatch(response.headers.get("cache-control") ?? "", /private|no-store/, `${pathname} must be cacheable`);
  assert.equal([...html.matchAll(/<h1(?:\s[^>]*)?>/g)].length, 1, `${pathname} H1`);
  assert.deepEqual(canonical(html).map((value) => new URL(value).href), [new URL(pathname, canonicalOrigin).href], `${pathname} canonical`);
  assert.deepEqual(meta(html, "robots"), ["index, follow"], `${pathname} robots`);
  assert.deepEqual(meta(html, "og:url").map((value) => new URL(value).href), [new URL(pathname, canonicalOrigin).href], `${pathname} OG URL`);
  assert.deepEqual(meta(html, "og:type"), ["website"]);
  assert.deepEqual(meta(html, "og:site_name"), ["Folveta"]);
  assert.deepEqual(meta(html, "twitter:card"), ["summary_large_image"]);
  assert.ok(meta(html, "og:image").some((value) => value.startsWith(`${canonicalOrigin}/`)));
  assert.equal(meta(html, "description").length, 1);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = meta(html, "description")[0];
  assert.ok(title && description, `${pathname} title and description`);
  assert.ok(!titles.has(title), `${pathname} unique title`);
  assert.ok(!descriptions.has(description), `${pathname} unique description`);
  titles.add(title); descriptions.add(description);
  for (const [, data] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    assert.ok(JSON.parse(data)["@context"], `${pathname} valid JSON-LD`);
  }
  const withCookie = await read(pathname, { cookie: "sb-cache-check-auth-token=invalid-test-value" });
  assert.equal(withCookie.response.status, 200);
  assert.equal(withCookie.response.headers.get("set-cookie"), null, `${pathname} cookie isolation`);
  assert.doesNotMatch(withCookie.response.headers.get("cache-control") ?? "", /private|no-store/);
  assert.equal(withCookie.html, html, `${pathname} must serve the same public shell with an auth cookie`);
  summaries.push({ pathname, status: response.status, cache: response.headers.get("x-vercel-cache") ?? response.headers.get("x-nextjs-cache"), title });
}

for (const pathname of ["/seo-check-missing-page", "/products/seo-check-missing-product"]) {
  const { response, html } = await read(pathname);
  assert.equal(response.status, 404, pathname);
  const directives = meta(html, "robots").flatMap((value) => value.split(/,\s*/));
  assert.ok(directives.includes("noindex"), `${pathname} noindex`);
  assert.ok(!directives.includes("index"), `${pathname} no conflicting index directive`);
}
const redirect = await read("/about/");
assert.ok([307, 308].includes(redirect.response.status));
assert.equal(new URL(redirect.response.headers.get("location"), base).pathname, "/about");

const sitemap = await read("/sitemap.xml");
assert.equal(sitemap.response.status, 200);
assert.deepEqual([...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).sort(), paths.map((pathname) => new URL(pathname, canonicalOrigin).href).sort());
const robots = await read("/robots.txt");
assert.equal(robots.response.status, 200);
assert.ok(robots.html.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
assert.ok(robots.html.includes("Disallow: /api/"));

for (const [pathname, status] of [["/api/viewer", 200], ["/api/guides", 401]]) {
  const { response, html } = await read(pathname);
  assert.equal(response.status, status, pathname);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  if (pathname === "/api/viewer") {
    const viewer = JSON.parse(html);
    assert.equal(viewer.user, null);
    assert.equal(viewer.limits.id, "free");
  }
}
console.log(JSON.stringify({ base, publicPages: summaries, checks: "PASS: metadata, CDN isolation, private APIs, 404, redirects, sitemap and robots" }, null, 2));
