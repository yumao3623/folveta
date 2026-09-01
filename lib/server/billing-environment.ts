import { getServerEnv } from "@/lib/env";

export const BILLING_ENVIRONMENTS = ["sandbox", "live"] as const;
export type BillingEnvironment = (typeof BILLING_ENVIRONMENTS)[number];

export function getBillingEnvironment(): BillingEnvironment | null {
  return getServerEnv().PADDLE_ENV ?? null;
}
