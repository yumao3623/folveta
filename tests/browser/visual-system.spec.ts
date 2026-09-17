import { expect, test } from "@playwright/test";

test("pressing a button moves its face, not its hit target", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mouse-down geometry is checked on desktop; touch is covered by Quick Check.");
  await page.goto("/");
  const button = page.getByRole("link", { name: "Build my Guide" });
  const before = (await button.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await expect.poll(() => button.evaluate((element) => getComputedStyle(element, "::before").transform)).toBe("matrix(1, 0, 0, 1, 0, 1)");
  const pressed = (await button.boundingBox())!;
  expect(pressed).toEqual(before);
  await page.mouse.move(5, 90); await page.mouse.up();
  await expect.poll(() => button.evaluate((element) => getComputedStyle(element, "::before").transform)).toBe("none");
});

test("workflow keeps all stages visible through autoplay, rapid selection and reduced motion", async ({ page }) => {
  await page.goto("/");
  const stages = page.locator(".flow-stage");
  await stages.first().scrollIntoViewIfNeeded();
  await expect(stages).toHaveCount(3);
  // Sample the middle of several animation cycles, not only static endpoints.
  const samples = await stages.evaluateAll(async (elements) => {
    const results: { opacity: string; width: number; height: number }[][] = [];
    const start = performance.now();
    while (performance.now() - start < 8800) {
      results.push(elements.map((element) => ({ opacity: getComputedStyle(element).opacity, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return results;
  });
  expect(samples.length).toBeGreaterThan(50);
  for (const sample of samples.flat()) {
    expect(sample.opacity).toBe("1");
    expect(sample.width).toBeGreaterThan(60);
    expect(sample.height).toBeGreaterThan(100);
  }
  for (const index of [1, 2, 0, 1, 0, 2, 1]) await stages.nth(index).click();
  await expect(stages.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Play workflow preview" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stages.nth(2).click();
  const duration = await stages.nth(2).locator(".flow-stage__art").evaluate((element) => parseFloat(getComputedStyle(element).animationDuration));
  expect(duration).toBeLessThan(0.01);
});

test("Quick Check allows keyboard selection, backwards navigation, and honest demo results", async ({ page, isMobile }) => {
  await page.goto("/study/demo/quick-check");
  const start = page.getByRole("button", { name: "Start Quick Check" });
  if (isMobile) await start.tap(); else { await start.focus(); await page.keyboard.press("Enter"); }
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  const first = page.getByRole("radio").first();
  if (isMobile) await first.locator("..").tap(); else { await first.focus(); await page.keyboard.press("Space"); }
  await expect(first).toBeChecked();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await expect(page.locator(".quick-question-enter")).toHaveAttribute("data-direction", "backward");
  for (let i = 0; i < 5; i++) {
    await page.getByRole("radio").first().locator("..").click();
    if (i < 4) await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.getByRole("heading", { name: "Quick Check complete" })).toBeVisible();
  await expect(page.locator(".result-hero")).toHaveAttribute("data-state", /complete|success/);
  await page.getByRole("link", { name: "Return to Study Guide" }).click();
  await expect(page).toHaveURL(/\/study\/demo/);
});

test("continuous resize preserves the home skeleton and visible controls", async ({ page }) => {
  await page.goto("/");
  const widths = [1440, 1360, 1281, 1280, 1279, 1200, 1100, 1025, 1024, 1023, 1001, 1000, 999, 900, 800, 769, 768, 767, 700, 640, 639, 560, 480, 420, 390, 360];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width > 700 ? 700 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `horizontal overflow at ${width}`).toBe(true);
    await expect(page.getByRole("link", { name: "Build my Guide" })).toBeVisible();
    await expect(page.locator(".flow-stage").nth(1)).toBeVisible();
    const columns = await page.locator(".duo-hero").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(columns, `hero skeleton at ${width}`).toBe(width < 768 ? 1 : 2);
  }
});

test("upload validation and queue removal stay local until submit", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/")) writes.push(request.url());
  });
  await page.goto("/");
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "unsupported.exe", mimeType: "application/octet-stream", buffer: Buffer.from("not a course document") });
  await expect(page.getByRole("alert").filter({ hasText: "unsupported.exe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload and continue" })).toBeDisabled();
  await input.setInputFiles({ name: "local-preview.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nLocal UI-only test; not sent to the server") });
  await expect(page.getByText("local-preview.pdf", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload and continue" })).toBeEnabled();
  await page.getByRole("button", { name: /Remove.*local-preview/ }).click();
  await expect(page.getByRole("button", { name: "Upload and continue" })).toBeDisabled();
  expect(writes).toEqual([]);
});

test("390px Quick Check keeps a complete answer above the fixed toolbar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "This is the explicit phone-viewport geometry check.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/study/demo/quick-check");
  await page.getByRole("button", { name: "Start Quick Check" }).click();

  const firstAnswer = await page.locator(".quick-answer").first().boundingBox();
  const toolbar = await page.locator(".assessment-toolbar").boundingBox();
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(firstAnswer).not.toBeNull();
  expect(toolbar).not.toBeNull();
  expect(firstAnswer!.y + firstAnswer!.height).toBeLessThanOrEqual(toolbar!.y);
  expect(toolbar!.y + toolbar!.height).toBeLessThanOrEqual(viewportHeight);
});

test("1100px Guide uses the compact sidebar instead of phone navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "This is the explicit laptop-width shell check.");
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/study/demo");
  await expect(page.locator(".learning-sidebar")).toBeVisible();
  await expect(page.locator(".learning-mobile-nav")).toBeHidden();
  const sidebar = await page.locator(".learning-sidebar").boundingBox();
  const content = await page.locator("#overview").boundingBox();
  expect(sidebar?.width).toBe(240);
  expect(content?.x).toBeGreaterThanOrEqual(240);
});
