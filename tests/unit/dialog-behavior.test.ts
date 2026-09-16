import { describe, expect, it } from "vitest";
import { DIALOG_EXIT_MS, dialogExitDuration, dialogFocusTargetIndex } from "@/components/ui/dialog-behavior";

describe("shared dialog behavior", () => {
  it("wraps forward Tab from the last control and Shift+Tab from the first", () => {
    expect(dialogFocusTargetIndex(3, 2, false)).toBe(0);
    expect(dialogFocusTargetIndex(3, 0, true)).toBe(2);
  });
  it("restores keyboard focus entering from outside the dialog", () => {
    expect(dialogFocusTargetIndex(3, -1, false)).toBe(0);
    expect(dialogFocusTargetIndex(3, -1, true)).toBe(2);
  });
  it("leaves normal tab order alone and handles zero or one control", () => {
    expect(dialogFocusTargetIndex(3, 1, false)).toBeNull();
    expect(dialogFocusTargetIndex(0, -1, false)).toBeNull();
    expect(dialogFocusTargetIndex(1, 0, true)).toBe(0);
  });
  it("removes exit delay for reduced motion", () => {
    expect(dialogExitDuration(false)).toBe(DIALOG_EXIT_MS);
    expect(dialogExitDuration(true)).toBe(0);
  });
});
