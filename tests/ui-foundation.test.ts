import { describe, expect, it } from "vitest";
import {
  badgeClassName,
  buttonClassName,
  cn,
  iconFrameClassName,
  surfaceClassName,
} from "@/components/ui/styles";

describe("Folveta UI foundation class contracts", () => {
  it("builds the default button from stable semantic classes", () => {
    expect(buttonClassName()).toBe(
      "ui-button ui-button--primary ui-button--md",
    );
  });

  it("keeps button variants and sizes composable", () => {
    expect(
      buttonClassName({
        variant: "destructive",
        size: "icon",
        className: "x",
      }),
    ).toContain("ui-button--destructive ui-button--icon x");
  });

  it("uses one tone vocabulary across icons and badges", () => {
    expect(iconFrameClassName({ tone: "source" })).toContain(
      "ui-icon-frame--source",
    );
    expect(badgeClassName("warning")).toContain("ui-badge--warning");
  });

  it("maps surfaces without adding a modifier for the base surface", () => {
    expect(surfaceClassName()).toBe("ui-surface");
    expect(surfaceClassName("interactive")).toBe(
      "ui-surface ui-surface--interactive",
    );
  });

  it("drops falsey class fragments", () => {
    expect(cn("one", false, undefined, "two")).toBe("one two");
  });
});
