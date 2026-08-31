import { getSupabaseAdmin } from "@/lib/server/supabase";
import { BILLING_PLANS, type BillingPlanId } from "@/lib/billing/config";
import { getBillingEnvironment } from "@/lib/server/billing-environment";

type BillingSummary = {
  plan: "free" | "pro";
  quota: number;
  consumed: number;
  reserved: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
  subscriptionStatus: string | null;
};

export type BillingLimits = (typeof BILLING_PLANS)[BillingPlanId];

function billingRpc(name: string, args: Record<string, unknown>) {
  return (getSupabaseAdmin() as unknown as {
    rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  }).rpc(name, args);
}

export async function getBillingSummary(userId: string): Promise<BillingSummary> {
  const { data, error } = await billingRpc("billing_usage_summary", {
    p_user_id: userId,
    p_billing_environment: getBillingEnvironment(),
  });
  if (error) throw new Error(error.message ?? "BILLING_SUMMARY_FAILED");
  return (data ?? {
    plan: "free",
    quota: 2,
    consumed: 0,
    reserved: 0,
    remaining: 2,
    periodStart: new Date().toISOString().slice(0, 10),
    periodEnd: new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10),
    subscriptionStatus: null,
  }) as BillingSummary;
}

export async function getBillingPlanForUser(userId: string | null): Promise<BillingPlanId> {
  if (!userId) return "free";
  const { data, error } = await getSupabaseAdmin()
    .from("billing_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("billing_environment", getBillingEnvironment())
    .in("status", ["active", "trialing"])
    .limit(1);
  if (error) throw error;
  return data?.length ? "pro" : "free";
}

export async function getBillingLimitsForUser(userId: string | null): Promise<BillingLimits> {
  return BILLING_PLANS[await getBillingPlanForUser(userId)];
}

export function isBillingQuotaError(error: unknown) {
  return error instanceof Error && /billing_quota_exceeded/i.test(error.message);
}
