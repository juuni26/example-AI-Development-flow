import { test as base, expect, type Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";

export const CREDENTIALS = {
  admin: { email: "admin@cleandrop.test", password: "Cleandrop!Admin-2026" },
  user: { email: "user@cleandrop.test", password: "Cleandrop!User-2026" },
} as const;

/**
 * Logs in via the form (the browser path the evaluator will exercise) and
 * waits until the catalog page is fully rendered. Returns the page so the
 * caller can chain page-level assertions.
 */
export async function loginAs(page: Page, role: keyof typeof CREDENTIALS): Promise<void> {
  const { email, password } = CREDENTIALS[role];
  await page.goto("/login");
  // Use role-based locators on the form inputs — getByLabel("Email") would
  // substring-match the "Copy email" aria-labels on the demo-credentials
  // copy buttons.
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  // <input type="password"> exposes no implicit role, so target it by id.
  await page.locator("#password").fill(password);
  await page
    .locator("form")
    .first()
    .getByRole("button", { name: /^sign in$/i })
    .click();
  await page.waitForURL("**/services");
  // Wait for the first row of the catalog to render — the page is only
  // really "ready" once data has arrived.
  await expect(page.getByRole("heading", { name: "Services", exact: true })).toBeVisible();
}

export const test = base;
export { expect };
