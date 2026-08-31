import { describe, expect, it } from "vitest";
import { getScheduledCancellation } from "@/lib/billing/subscription-ui";

const periodEnd = "2026-09-30T09:20:46.125238Z";

describe("billing subscription presentation", () => {
  it("keeps an active subscription cancellable when no cancellation is scheduled", () => {
    expect(getScheduledCancellation({
      status: "active",
      cancel_at_period_end: false,
      current_period_end: periodEnd,
      scheduled_change: null,
    })).toBeNull();
  });

  it("shows a scheduled cancellation without changing the active entitlement", () => {
    expect(getScheduledCancellation({
      status: "active",
      cancel_at_period_end: true,
      current_period_end: periodEnd,
      scheduled_change: { action: "cancel", effectiveAt: periodEnd },
    })).toBe(periodEnd);
  });

  it("does not present a cancellation schedule after the subscription ends", () => {
    expect(getScheduledCancellation({
      status: "canceled",
      cancel_at_period_end: true,
      current_period_end: periodEnd,
      scheduled_change: { action: "cancel", effective_at: periodEnd },
    })).toBeNull();
  });
});
