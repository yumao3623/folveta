import { getPaddleInstance, getPaddleWebhookSecret, type PaddleEvent } from "@/lib/server/paddle";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { processPaddleEvent } from "@/lib/server/paddle-webhook";
import { getBillingEnvironment } from "@/lib/server/billing-environment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  if (!signature || !rawBody) return Response.json({ error: "Missing signature or body" }, { status: 400 });
  try {
    const event = await getPaddleInstance().webhooks.unmarshal(rawBody, getPaddleWebhookSecret(), signature) as unknown as PaddleEvent;
    const billingEnvironment = getBillingEnvironment();
    const admin = getSupabaseAdmin();
    const { error: ledgerError } = await admin.from("billing_webhook_events").insert({
      billing_environment: billingEnvironment,
      event_id: event.eventId,
      event_type: event.eventType,
      occurred_at: event.occurredAt ?? null,
      status: "failed",
    });
    if (ledgerError?.code === "23505") {
      const { data: existing } = await admin.from("billing_webhook_events")
        .select("status")
        .eq("billing_environment", billingEnvironment)
        .eq("event_id", event.eventId)
        .maybeSingle();
      if (existing?.status === "processed" || existing?.status === "ignored") {
        return Response.json({ received: true, duplicate: true });
      }
      await admin.from("billing_webhook_events")
        .update({ received_at: new Date().toISOString() })
        .eq("billing_environment", billingEnvironment)
        .eq("event_id", event.eventId);
    }
    if (ledgerError && ledgerError.code !== "23505") throw ledgerError;
    const status = await processPaddleEvent(billingEnvironment, event);
    await admin.from("billing_webhook_events").update({
      status,
      processed_at: new Date().toISOString(),
    }).eq("billing_environment", billingEnvironment).eq("event_id", event.eventId);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook error", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
