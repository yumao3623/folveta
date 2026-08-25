export const SITE_NAME = "Folveta";

const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return new URL(configuredUrl || LOCAL_SITE_URL);
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}
