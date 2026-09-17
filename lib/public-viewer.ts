import type { BILLING_PLANS, BillingPlanId } from "@/lib/billing/config";

export type PublicViewer = {
  user: { id: string; email: string | null } | null;
  limits: (typeof BILLING_PLANS)[BillingPlanId];
};
