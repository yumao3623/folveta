export const SITE_NAME = "Folveta";

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

  return new URL(configuredUrl || LOCAL_SITE_URL);
}

export function absoluteUrl(
  path = "/",
  environment: IndexingEnvironment = process.env,
) {
  return new URL(path, getSiteUrl(environment)).toString();
}
