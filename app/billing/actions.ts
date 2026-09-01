"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/server/auth";
import { getPaddleInstance } from "@/lib/server/paddle";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getBillingEnvironment } from "@/lib/server/billing-environment";

export async function createCustomerPortalSession() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" } as const;
  const admin = getSupabaseAdmin();
  const billingEnvironment = getBillingEnvironment();
  if (!billingEnvironment) return { error: "Billing is not enabled yet" } as const;
  const { data: customer } = await admin.from("billing_customers").select("paddle_customer_id").eq("user_id", user.id).eq("billing_environment", billingEnvironment).maybeSingle();
  if (!customer) return { error: "No Paddle customer yet" } as const;
  const { data: subscriptions } = await admin.from("billing_subscriptions").select("paddle_subscription_id").eq("user_id", user.id).eq("billing_environment", billingEnvironment).in("status", ["active", "trialing", "past_due"]);
  const session = await getPaddleInstance().customerPortalSessions.create(customer.paddle_customer_id, (subscriptions ?? []).map((row) => row.paddle_subscription_id));
  return { url: session.urls.general.overview } as const;
}

export async function cancelCurrentSubscription() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" } as const;
  const billingEnvironment = getBillingEnvironment();
  if (!billingEnvironment) return { error: "Billing is not enabled yet" } as const;
  const { data: subscription } = await getSupabaseAdmin().from("billing_subscriptions").select("paddle_subscription_id").eq("user_id", user.id).eq("billing_environment", billingEnvironment).in("status", ["active", "trialing", "past_due"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!subscription) return { error: "No active subscription" } as const;
  const canceled = await getPaddleInstance().subscriptions.cancel(subscription.paddle_subscription_id, { effectiveFrom: "next_billing_period" });
  revalidatePath("/profile");
  return { success: true, status: canceled.status, scheduledChange: canceled.scheduledChange?.effectiveAt ?? null } as const;
}
