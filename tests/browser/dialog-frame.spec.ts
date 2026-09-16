import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

let javascript = "";
let css = "";

// Mount the actual component in an isolated browser document. No authenticated
// route, account, Guide mutation, or external service is needed for this test.
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React, { useRef, useState } from "react";
        import { createRoot } from "react-dom/client";
        import { DialogFrame } from "./components/ui/dialog-frame";
        function Harness() {
          const [open, setOpen] = useState(false);
          const [pending, setPending] = useState(false);
          const input = useRef(null);
          return <main style={{minHeight: 1800, padding: 20}}>
            <button onClick={() => setOpen(true)}>Open dialog</button>
            <DialogFrame open={open} pending={pending} initialFocusRef={input} onClose={() => setOpen(false)} labelledBy="dialog-title">
              <h2 id="dialog-title">Test dialog</h2>
              <input ref={input} aria-label="Guide title" />
              <button onClick={() => setPending(!pending)}>{pending ? "Stop pending" : "Start pending"}</button>
              <button onClick={() => setOpen(false)}>Cancel</button>
            </DialogFrame>
          </main>;
        }
        createRoot(document.getElementById("root")).render(<Harness />);`,
      resolveDir: resolve("."),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    outdir: "/virtual-dialog-test",
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    alias: { "@": resolve(".") },
    define: { "process.env.NODE_ENV": '"production"' },
  });
  javascript = result.outputFiles.find((file) => file.path.endsWith(".js"))!.text;
  css = result.outputFiles.find((file) => file.path.endsWith(".css"))!.text;
});

test("dialog traps focus, locks scroll without shifting, blocks pending Escape and restores focus", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--surface:#fff;--border:#d3e3da;--foreground:#20332b;--ease-spring:cubic-bezier(.34,1.56,.64,1)}*{box-sizing:border-box}body{margin:0;font-family:sans-serif}</style><div id="root"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript });
  const trigger = page.getByRole("button", { name: "Open dialog" });
  const before = await trigger.boundingBox();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Guide title" })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("dialog-open.png") });
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  expect((await trigger.boundingBox())?.x).toBe(before?.x);
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "Guide title" })).toBeFocused();
  await page.getByRole("button", { name: "Start pending" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Stop pending" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await trigger.click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("dialog backdrop dismissal preserves reduced-motion behavior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--surface:#fff;--border:#d3e3da;--foreground:#20332b}*{box-sizing:border-box}body{margin:0;font-family:sans-serif}</style><div id="root"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript });
  const trigger = page.getByRole("button", { name: "Open dialog" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  await page.mouse.click(2, 2);
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
