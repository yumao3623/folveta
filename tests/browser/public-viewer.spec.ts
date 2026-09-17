import { expect, test } from "@playwright/test";
import { BILLING_PLANS } from "../../lib/billing/config";

const anonymous = { user: null, limits: BILLING_PLANS.free };
const pro = { user: { id: "student-a", email: "student-a@example.test" }, limits: BILLING_PLANS.pro };

test("cached public HTML loads private controls and survives a plan downgrade", async ({ page }) => {
  let viewer: { user: typeof pro.user | null; limits: typeof BILLING_PLANS.free | typeof BILLING_PLANS.pro } = pro;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/viewer", async (route) => { await gate; await route.fulfill({ json: viewer }); });
  await page.route("**/api/guides?*", (route) => route.fulfill({ json: { guides: [] } }));
  const writes: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") writes.push(request.url()); });
  const response = await page.goto("/");
  expect(await response!.text()).not.toContain(pro.user.email);
  const account = page.locator(".site-header__account");
  const initialWidth = (await account.boundingBox())!.width;
  const input = page.locator('input[type="file"]');
  await expect(input).toBeDisabled();
  release();
  await expect(page.getByRole("link", { name: "Open Profile" })).toBeVisible();
  await expect(page.getByText("Up to 10", { exact: true })).toBeVisible();
  expect((await account.boundingBox())!.width).toBe(initialWidth);
  await input.setInputFiles(Array.from({ length: 4 }, (_, i) => ({ name: `course-${i}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nUI-only fixture") })));
  await expect(page.getByRole("button", { name: "Upload and continue" })).toBeEnabled();
  viewer = anonymous;
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page.getByRole("link", { name: "Open Profile" })).toHaveCount(0);
  await expect(page.getByText("Up to 3", { exact: true })).toBeVisible();
  await expect(input).toBeEnabled();
  await page.getByRole("button", { name: "Upload and continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "at most 3 files" })).toBeVisible();
  expect(writes).toEqual([]);
});

test("viewer errors keep uploads disabled and support recovery", async ({ page }) => {
  let failed = true;
  await page.route("**/api/viewer", (route) => route.fulfill(failed ? { status: 503, json: { error: "unavailable" } } : { json: anonymous }));
  await page.goto("/");
  await expect(page.getByRole("alert").filter({ hasText: "could not check your plan" })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  failed = false;
  await page.getByRole("button", { name: "Refresh and try again" }).click();
  await expect(page.locator('input[type="file"]')).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Sign in to see recent Guides" })).toBeVisible();
});

test("switching accounts removes the previous account's recent Guides", async ({ page }) => {
  let viewer = pro;
  await page.route("**/api/viewer", (route) => route.fulfill({ json: viewer }));
  await page.route("**/api/guides?*", (route) => route.fulfill({ json: { guides: [{
    id: viewer.user.id, sessionId: viewer.user.id, title: `${viewer.user.id} private guide`,
    createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", lastAccessedAt: "2026-09-01T00:00:00Z",
    archivedAt: null, sourceCount: 1, state: "guide_ready",
  }] } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "student-a private guide" })).toBeVisible();
  viewer = { ...pro, user: { id: "student-b", email: "student-b@example.test" } };
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page.getByRole("heading", { name: "student-b private guide" })).toBeVisible();
  await expect(page.getByText("student-a private guide")).toHaveCount(0);
});

test("Pricing defers Paddle and anonymous subscription goes to sign in", async ({ page }) => {
  let paddleRequests = 0;
  await page.route("https://cdn.paddle.com/**", (route) => { paddleRequests++; return route.abort(); });
  await page.route("**/api/viewer", (route) => route.fulfill({ json: anonymous }));
  await page.goto("/pricing");
  const subscribe = page.getByRole("button", { name: "Sign in to subscribe" });
  await expect(subscribe).toBeEnabled();
  expect(paddleRequests).toBe(0);
  await subscribe.click();
  await expect(page).toHaveURL(/\/auth\?next=%2Fpricing/);
  expect(paddleRequests).toBe(0);
});

test("checkout loads on intent and uses freshly verified identity", async ({ page }) => {
  let viewerCalls = 0;
  let paddleRequests = 0;
  await page.route("**/api/viewer", (route) => {
    viewerCalls++;
    return route.fulfill({ json: viewerCalls === 1 ? pro : { ...pro, user: { id: "student-b", email: "student-b@example.test" } } });
  });
  await page.route("https://cdn.paddle.com/**", (route) => {
    paddleRequests++;
    return route.fulfill({ contentType: "application/javascript", body: `window.PaddleBillingV1 = { Environment: { set() {} }, Initialize() {}, Checkout: { open(options) { window.__testCheckout = options; } } };` });
  });
  await page.goto("/pricing");
  const subscribe = page.getByRole("button", { name: /Subscribe in/ });
  await expect(subscribe).toBeEnabled();
  expect(paddleRequests).toBe(0);
  await subscribe.click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __testCheckout?: { customData: { user_id: string } } }).__testCheckout?.customData.user_id)).toBe("student-b");
  expect(paddleRequests).toBe(1);
  expect(viewerCalls).toBe(2);
});
