export const SITE_NAME = "Folveta";
export const PRODUCTION_ORIGIN = "https://folveta.com";
export const PUBLIC_PAGE_PATHS = [
  "/", "/about", "/privacy", "/terms", "/pricing", "/study-guide-maker-from-pdf",
  "/how-to-make-a-study-guide", "/refunds", "/contact",
] as const;

// 仅记录实质内容变更日期；没有可靠日期的页面不输出 lastmod。
export const PUBLIC_PAGE_MODIFIED: Partial<Record<typeof PUBLIC_PAGE_PATHS[number], string>> = {
  "/": "2026-09-22",
  "/study-guide-maker-from-pdf": "2026-09-22",
  "/how-to-make-a-study-guide": "2026-09-18",
};

const LOCAL_SITE_URL = "http://localhost:3000";

export type IndexingEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string;
  PRELAUNCH?: string;
  VERCEL_ENV?: string;
};

export function isPrelaunch(environment: IndexingEnvironment = process.env) {
  if (environment.VERCEL_ENV && environment.VERCEL_ENV !== "production") {
    return true;
  }

  return environment.PRELAUNCH?.trim().toLowerCase() !== "false";
}

export function getPublicRobots(environment: IndexingEnvironment = process.env) {
  const indexingEnabled = !isPrelaunch(environment);
  return { index: indexingEnabled, follow: indexingEnabled };
}

export function getSiteUrl(environment: IndexingEnvironment = process.env) {
  const configuredUrl = environment.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl && (environment.VERCEL_ENV === "production" || !isPrelaunch(environment))) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required for a production or publicly indexable build.",
    );
  }

  const url = new URL(configuredUrl || LOCAL_SITE_URL);
  if (environment.VERCEL_ENV === "production" && (
    url.origin !== PRODUCTION_ORIGIN || url.pathname !== "/" || url.search || url.hash || url.username || url.password
  )) {
    throw new Error(`Production NEXT_PUBLIC_SITE_URL must be ${PRODUCTION_ORIGIN}.`);
  }
  return url;
}

export function absoluteUrl(
  path = "/",
  environment: IndexingEnvironment = process.env,
) {
  return new URL(path, getSiteUrl(environment)).toString();
}
