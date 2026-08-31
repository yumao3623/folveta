import type { Json } from "@/lib/server/database.types";

type SubscriptionCancellationSource = {
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  scheduled_change: Json | null;
};

function scheduledCancellationAt(scheduledChange: Json | null) {
  if (!scheduledChange || typeof scheduledChange !== "object" || Array.isArray(scheduledChange)) return null;
  const action = scheduledChange.action;
  const effectiveAt = scheduledChange.effective_at ?? scheduledChange.effectiveAt;
  return action === "cancel" && typeof effectiveAt === "string" && !Number.isNaN(Date.parse(effectiveAt))
    ? effectiveAt
    : null;
}

export function getScheduledCancellation(subscription: SubscriptionCancellationSource | null) {
  if (!subscription || !["active", "trialing"].includes(subscription.status)) return null;
  const effectiveAt = scheduledCancellationAt(subscription.scheduled_change);
  if (!effectiveAt || !subscription.cancel_at_period_end) return null;
  return effectiveAt ?? subscription.current_period_end;
}
