import { test, expect, CREDENTIALS, loginAs } from "./fixtures";

test.describe("authentication flow", () => {
  test("logged-out access to /services redirects to /login with a next param", async ({ page }) => {
    await page.goto("/services");
    await page.waitForURL(/\/login\?next=.*services/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("admin logs in and lands on /services", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page).toHaveURL(/\/services/);
    // The desktop sidebar shows the email local-part + a role label. Target
    // by aria-label since there's also a hidden mobile off-canvas <aside>.
    const sidebar = page.getByRole("complementary", { name: "Primary navigation" });
    await expect(sidebar.getByText("admin", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Administrator", { exact: true })).toBeVisible();
  });

  test("user logs in and lands on /services", async ({ page }) => {
    await loginAs(page, "user");
    await expect(page).toHaveURL(/\/services/);
  });

  test("bad credentials surface a single inline error and do not leak which field was wrong", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(CREDENTIALS.admin.email);
    await page.locator("#password").fill("definitely-wrong");
    await page.locator("form").first().getByRole("button", { name: /^sign in$/i }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    // The exact phrasing is the generic "Invalid email or password" — explicitly
    // NOT a field-specific message like "Wrong password" or "Email not found".
    await expect(alert).toHaveText("Invalid email or password");
  });

  test("logged-in user visiting /login is bounced to /services", async ({ page }) => {
    await loginAs(page, "user");
    await page.goto("/login");
    await page.waitForURL("**/services");
  });

  test("sign-out from the sidebar clears state and redirects to /login", async ({ page }) => {
    await loginAs(page, "user");
    // The sidebar footer is a popover: click the avatar to open it, then the
    // Sign out menu item (CONTEXT.md: "Click opens a popover with a Logout button").
    const sidebar = page.getByRole("complementary", { name: "Primary navigation" });
    await sidebar.getByRole("button", { name: /open account menu/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await page.waitForURL("**/login");
    // Hitting /services again should bounce back to /login since the session is gone.
    await page.goto("/services");
    await page.waitForURL(/\/login\?next=.*services/);
  });
});
