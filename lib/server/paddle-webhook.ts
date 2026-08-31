import type { Json } from "@/lib/server/database.types";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import type { PaddleEvent } from "@/lib/server/paddle";
import type { BillingEnvironment } from "@/lib/server/billing-environment";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function customUserId(data: Record<string, unknown>) {
  const custom = asRecord(data.custom_data ?? data.customData);
  const userId = custom.user_id ?? custom.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

function stringField(data: Record<string, unknown>, snakeCase: string, camelCase: string) {
  const value = data[snakeCase] ?? data[camelCase];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function dateValue(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function subscriptionPeriod(data: Record<string, unknown>) {
  const period = asRecord(data.current_billing_period ?? data.currentBillingPeriod);
  return {
    start: dateValue(period.starts_at ?? period.startsAt),
    end: dateValue(period.ends_at ?? period.endsAt),
  };
}

function normalizedStatus(value: unknown) {
  return ["trialing", "active", "past_due", "paused", "canceled", "completed"].includes(String(value))
    ? String(value)
    : "canceled";
}

async function upsertCustomer(billingEnvironment: BillingEnvironment, userId: string, customerId: string, email: string | null) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("billing_customers").upsert({
    billing_environment: billingEnvironment,
    user_id: userId,
    paddle_customer_id: customerId,
    email,
    updated_at: new Date().toISOString(),
  }, { onConflict: "billing_environment,user_id" });
  if (error) throw error;
}

async function resolveUserId(billingEnvironment: BillingEnvironment, data: Record<string, unknown>) {
  const explicit = customUserId(data);
  if (explicit) return explicit;
  const customerId = stringField(data, "customer_id", "customerId");
  if (!customerId) return null;
  const { data: row } = await getSupabaseAdmin()
    .from("billing_customers")
    .select("user_id")
    .eq("billing_environment", billingEnvironment)
    .eq("paddle_customer_id", customerId)
    .maybeSingle();
  return row?.user_id ?? null;
}

async function processCustomer(billingEnvironment: BillingEnvironment, event: PaddleEvent) {
  const data = asRecord(event.data);
  const userId = customUserId(data);
  const customerId = stringField(data, "id", "id");
  if (!userId || !customerId) return "ignored" as const;
  const email = typeof data.email === "string" ? data.email : null;
  await upsertCustomer(billingEnvironment, userId, customerId, email);
  return "processed" as const;
}

async function processTransaction(billingEnvironment: BillingEnvironment, event: PaddleEvent) {
  const data = asRecord(event.data);
  const userId = customUserId(data);
  const customerId = stringField(data, "customer_id", "customerId");
  if (!userId || !customerId) return "ignored" as const;
  const customer = asRecord(data.customer);
  await upsertCustomer(billingEnvironment, userId, customerId, typeof customer.email === "string" ? customer.email : null);
  return "processed" as const;
}

async function processSubscription(billingEnvironment: BillingEnvironment, event: PaddleEvent) {
  const data = asRecord(event.data);
  const subscriptionId = stringField(data, "id", "id");
  const customerId = stringField(data, "customer_id", "customerId");
  const price = asRecord(data.items && Array.isArray(data.items) ? data.items[0] : null);
  const priceEntity = asRecord(price.price);
  const priceId = stringField(price, "price_id", "priceId") ?? stringField(priceEntity, "id", "id") ?? "unknown";
  const productId = stringField(price, "product_id", "productId") ?? stringField(priceEntity, "product_id", "productId") ?? "unknown";
  if (!subscriptionId || !customerId) return "ignored" as const;
  const userId = await resolveUserId(billingEnvironment, data);
  const period = subscriptionPeriod(data);
  const incomingOccurred = dateValue(event.occurredAt) ?? new Date().toISOString();
  const admin = getSupabaseAdmin();
  const { data: current } = await admin.from("billing_subscriptions")
    .select("last_event_occurred_at")
    .eq("billing_environment", billingEnvironment)
    .eq("paddle_subscription_id", subscriptionId)
    .maybeSingle();
  if (current?.last_event_occurred_at && Date.parse(current.last_event_occurred_at) > Date.parse(incomingOccurred)) {
    return "ignored" as const;
  }
  const { error } = await admin.from("billing_subscriptions").upsert({
    billing_environment: billingEnvironment,
    paddle_subscription_id: subscriptionId,
    user_id: userId,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status: normalizedStatus(data.status),
    current_period_start: period.start,
    current_period_end: period.end,
    scheduled_change: (data.scheduled_change ?? data.scheduledChange ?? null) as Json | null,
    cancel_at_period_end: asRecord(data.scheduled_change ?? data.scheduledChange).action === "cancel",
    next_billed_at: dateValue(data.next_billed_at ?? data.nextBilledAt),
    last_event_occurred_at: incomingOccurred,
    raw_data: {
      id: subscriptionId,
      status: normalizedStatus(data.status),
      customer_id: customerId,
      price_id: priceId,
      product_id: productId,
    } as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: "billing_environment,paddle_subscription_id" });
  if (error) throw error;
  return "processed" as const;
}

export async function processPaddleEvent(billingEnvironment: BillingEnvironment, event: PaddleEvent) {
  switch (event.eventType) {
    case "customer.created":
    case "customer.updated":
      return processCustomer(billingEnvironment, event);
    case "transaction.completed":
    case "transaction.paid":
      return processTransaction(billingEnvironment, event);
    case "subscription.created":
    case "subscription.updated":
    case "subscription.activated":
    case "subscription.trialing":
    case "subscription.past_due":
    case "subscription.paused":
    case "subscription.resumed":
    case "subscription.canceled":
      return processSubscription(billingEnvironment, event);
    default:
      return "ignored" as const;
  }
}
