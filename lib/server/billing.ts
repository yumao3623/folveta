import { getSupabaseAdmin } from "@/lib/server/supabase";
import { BILLING_PLANS, type BillingPlanId } from "@/lib/billing/config";
import { getBillingEnvironment } from "@/lib/server/billing-environment";
import { getScheduledCancellation } from "@/lib/billing/subscription-ui";

type BillingSummary = {
  plan: "free" | "pro";
  quota: number;
  consumed: number;
  reserved: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
  subscriptionStatus: string | null;
  scheduledCancellationAt: string | null;
};

export type BillingLimits = (typeof BILLING_PLANS)[BillingPlanId];

function billingRpc(name: string, args: Record<string, unknown>) {
  return (getSupabaseAdmin() as unknown as {
    rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  }).rpc(name, args);
}

export async function getBillingSummary(userId: string): Promise<BillingSummary> {
  const billingEnvironment = getBillingEnvironment();
  if (!billingEnvironment) {
    const periodStart = new Date().toISOString().slice(0, 10);
    const periodEnd = new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10);
    return {
      plan: "free",
      quota: BILLING_PLANS.free.monthlyStudyGuides,
      consumed: 0,
      reserved: 0,
      remaining: BILLING_PLANS.free.monthlyStudyGuides,
      periodStart,
      periodEnd,
      subscriptionStatus: null,
      scheduledCancellationAt: null,
    };
  }
  const admin = getSupabaseAdmin();
  const [{ data, error }, { data: subscription, error: subscriptionError }] = await Promise.all([
    billingRpc("billing_usage_summary", {
      p_user_id: userId,
      p_billing_environment: billingEnvironment,
    }),
    admin
      .from("billing_subscriptions")
      .select("status, cancel_at_period_end, current_period_end, scheduled_change")
      .eq("user_id", userId)
      .eq("billing_environment", billingEnvironment)
      .in("status", ["active", "trialing"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) throw new Error(error.message ?? "BILLING_SUMMARY_FAILED");
  if (subscriptionError) throw subscriptionError;
  const summary = (data ?? {
    plan: "free",
    quota: 2,
    consumed: 0,
    reserved: 0,
    remaining: 2,
    periodStart: new Date().toISOString().slice(0, 10),
    periodEnd: new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10),
    subscriptionStatus: null,
  }) as Omit<BillingSummary, "scheduledCancellationAt">;
  return { ...summary, scheduledCancellationAt: getScheduledCancellation(subscription) };
}

export async function getBillingPlanForUser(userId: string | null): Promise<BillingPlanId> {
  if (!userId) return "free";
  const billingEnvironment = getBillingEnvironment();
  if (!billingEnvironment) return "free";
  const { data, error } = await getSupabaseAdmin()
    .from("billing_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("billing_environment", billingEnvironment)
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
