import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

test("landing page links to the public example Guide", async ({ page }) => {
  const errors = trackBrowserErrors(page);

  await page.goto("/");
  await expect(page).toHaveTitle(/Folveta/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Study Guide Maker/i);

  await page.getByRole("link", { name: /Example guide/i }).first().click();
  await expect(page).toHaveURL(/\/study\/demo$/);
  await expect(page.getByText(/Example guide/).first()).toBeVisible();
  await expect(page.getByText("Study Guide · V2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your study map" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cellular respiration and chemiosmosis" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Key concepts" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Definitions" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Processes & relationships" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Common confusions" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice prompts" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Quick Check/i }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("demo Quick Check completes without external writes", async ({ page }) => {
  const errors = trackBrowserErrors(page);

  await page.goto("/study/demo/quick-check");
  await expect(page.getByRole("heading", { name: "Quick Check" })).toBeVisible();
  await page.getByRole("button", { name: "Start Quick Check" }).click();

  for (let question = 0; question < 5; question += 1) {
    await page.getByRole("radio").first().locator("..").click();
    if (question < 4) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
  }

  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.getByRole("heading", { name: "Quick Check complete" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to Study Guide" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("study method leads through PDF and pricing to the correct Free upload limit", async ({ page }) => {
  const errors = trackBrowserErrors(page);
  await page.goto("/how-to-make-a-study-guide");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("How to make a study guide");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
  await page.getByRole("link", { name: "PDF to Study Guide workflow", exact: true }).click();
  await expect(page).toHaveURL(/\/study-guide-maker-from-pdf$/);
  await page.getByText("What if my PDF is scanned or image-only?", { exact: true }).click();
  await expect(page.getByText(/run OCR with a tool you trust/)).toBeVisible();
  await page.getByRole("link", { name: "Free and Pro limits", exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await page.getByRole("link", { name: "Create a Study Guide", exact: true }).click();
  await expect(page).toHaveURL(/\/#upload$/);
  await expect(page.getByText("0/3 files", { exact: true })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(
    Array.from({ length: 4 }, (_, index) => ({ name: `course-${index}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test-only selection") })),
  );
  await expect(page.getByRole("alert").filter({ hasText: "Your plan allows" })).toContainText("at most 3 files");
  await expect(page.getByRole("button", { name: "Upload and continue" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("public pages share the Source Sans system and avoid horizontal overflow", async ({ page }) => {
  const routes = [
    "/",
    "/about",
    "/pricing",
    "/contact",
    "/privacy",
    "/refunds",
    "/terms",
    "/study-guide-maker-from-pdf",
    "/how-to-make-a-study-guide",
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const layout = await page.evaluate(() => ({
      fontFamily: getComputedStyle(document.body).fontFamily,
      fitsViewport: document.documentElement.scrollWidth <= window.innerWidth,
    }));
    expect(layout.fontFamily, `font on ${route}`).toContain("Source Sans 3");
    expect(layout.fitsViewport, `horizontal overflow on ${route}`).toBe(true);
  }
});
