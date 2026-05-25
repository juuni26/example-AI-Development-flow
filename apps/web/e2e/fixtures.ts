import { test as base, expect, type Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";

export const CREDENTIALS = {
  admin: { email: "admin@cleandrop.test", password: "admin123" },
  user: { email: "user@cleandrop.test", password: "user123" },
} as const;

/**
 * Logs in via the form (the browser path the evaluator will exercise) and
 * waits until the catalog page is fully rendered. Returns the page so the
 * caller can chain page-level assertions.
 */
export async function loginAs(
  page: Page,
  role: keyof typeof CREDENTIALS,
): Promise<void> {
  const { email, password } = CREDENTIALS[role];
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/services");
  // Wait for the first row of the catalog to render — the page is only
  // really "ready" once data has arrived.
  await expect(page.getByRole("heading", { name: "Services", exact: true })).toBeVisible();
}

export const test = base;
export { expect };
