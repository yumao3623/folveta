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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("study");

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
