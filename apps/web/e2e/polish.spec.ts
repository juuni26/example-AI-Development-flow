import { test, expect, loginAs } from "./fixtures";

test.describe("polish: sidebar collapse + demo credentials copy", () => {
  test("sidebar collapses, persists state across reloads, and expands again", async ({ page }) => {
    await loginAs(page, "user");

    const sidebar = page.getByRole("complementary", { name: "Primary navigation" });
    await expect(sidebar).toBeVisible();

    // Start expanded — collapse toggle should be visible.
    const collapseBtn = sidebar.getByRole("button", { name: "Collapse sidebar" });
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();

    // After collapse, the "platform" label is hidden and the expand button is present.
    await expect(sidebar.getByText("platform", { exact: true })).toBeHidden();
    await expect(sidebar.getByRole("button", { name: "Expand sidebar" })).toBeVisible();

    // Reload and confirm the collapse state survived via localStorage.
    await page.reload();
    await expect(sidebar.getByRole("button", { name: "Expand sidebar" })).toBeVisible();

    // Expand again to leave the app in a default-ish state for subsequent tests.
    await sidebar.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(sidebar.getByText("platform", { exact: true })).toBeVisible();
  });

  test("login page exposes both demo accounts with click-to-copy and a 'Use' shortcut", async ({
    page,
    context,
  }) => {
    // Clipboard requires permission in Chromium under Playwright.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/login");

    // Both account labels render.
    await expect(page.getByText("Administrator", { exact: true })).toBeVisible();
    await expect(page.getByText("Read-only user", { exact: true })).toBeVisible();

    // Copy the admin email and verify the clipboard.
    await page.getByRole("button", { name: "Copy email" }).first().click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe("admin@cleandrop.test");

    // The "Use" shortcut prefills the form and submits — by the time the
    // promise resolves we should be on /services.
    await page.getByRole("button", { name: /^use$/i }).first().click();
    await page.waitForURL("**/services");
    await expect(page.getByRole("heading", { name: "Services", exact: true })).toBeVisible();
  });
});
