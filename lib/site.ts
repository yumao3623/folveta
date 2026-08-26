export const SITE_NAME = "Folveta";

const LOCAL_SITE_URL = "http://localhost:3000";

export type IndexingEnvironment = {
  [key: string]: string | undefined;
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

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return new URL(configuredUrl || LOCAL_SITE_URL);
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}
