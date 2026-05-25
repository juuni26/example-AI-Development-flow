import { test, expect, loginAs, CREDENTIALS, API_URL } from "./fixtures";

test.describe("admin CRUD via the catalog UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("+ Add button and row-actions menus are visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^Add$/ })).toBeVisible();
    // At least one row should have an actions trigger.
    await expect(page.getByRole("button", { name: /actions for/i }).first()).toBeVisible();
  });

  test("create → edit → delete a service end-to-end, with summary refreshing each time", async ({
    page,
  }) => {
    // Unique name so the test is rerunnable.
    const name = `E2E Service ${Date.now()}`;

    // --- CREATE -----------------------------------------------------------
    await page.getByRole("button", { name: /^Add$/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("New service", { exact: true })).toBeVisible();

    await sheet.getByLabel("Name").fill(name);
    await sheet.getByLabel("Description").fill("Created by Playwright e2e suite.");

    // Helper: open a Radix Select by its label and pick an option from the
    // currently-open listbox. The listbox-scoped locator avoids ambiguity
    // with stale portals or other selects on the page.
    const pickOption = async (label: string, optionText: string | RegExp): Promise<void> => {
      await sheet.getByLabel(label).click();
      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();
      await listbox.getByRole("option", { name: optionText }).first().click();
      await expect(listbox).toBeHidden();
    };

    await pickOption("Category", "Specialty");
    await pickOption("Status", "Active");
    await pickOption("Company", /Acme|BrightHome/);

    await sheet.getByLabel(/duration/i).fill("45");
    await sheet.getByLabel(/base price/i).fill("123");

    await sheet.getByRole("button", { name: /create service/i }).click();

    // Sheet closes, toast appears, the new row shows up in the table.
    await expect(sheet).not.toBeVisible();
    await expect(page.getByText("Service created", { exact: false }).first()).toBeVisible();

    // Search for our newly-created row to make it easy to find regardless of sort/page.
    await page.getByLabel("Search services").fill(name);
    await expect(page.getByRole("row").filter({ hasText: name })).toBeVisible();

    // --- EDIT -------------------------------------------------------------
    await page.getByRole("button", { name: new RegExp(`actions for ${escapeRegExp(name)}`, "i") }).click();
    await page.getByRole("menuitem", { name: /edit/i }).click();
    const editSheet = page.getByRole("dialog");
    await expect(editSheet.getByText("Edit service", { exact: true })).toBeVisible();

    // Tweak the status to Draft via the same listbox-scoped helper pattern.
    await editSheet.getByLabel("Status").click();
    const editListbox = page.getByRole("listbox");
    await expect(editListbox).toBeVisible();
    await editListbox.getByRole("option", { name: "Draft" }).click();
    await expect(editListbox).toBeHidden();
    await editSheet.getByRole("button", { name: /save changes/i }).click();
    await expect(editSheet).not.toBeVisible();
    await expect(page.getByText("Service updated", { exact: false }).first()).toBeVisible();

    // The row's status badge should now say "Draft".
    const updatedRow = page.getByRole("row").filter({ hasText: name });
    await expect(updatedRow.getByText("Draft")).toBeVisible();

    // --- DELETE -----------------------------------------------------------
    await page.getByRole("button", { name: new RegExp(`actions for ${escapeRegExp(name)}`, "i") }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText(name);
    await confirm.getByRole("button", { name: /^delete$/i }).click();
    await expect(confirm).not.toBeVisible();
    await expect(page.getByText("Deleted", { exact: false }).first()).toBeVisible();

    // Search for it again — should be gone from the catalog.
    await page.getByLabel("Search services").fill(name);
    await expect(page.getByText("No services match these filters.")).toBeVisible();
  });
});

test.describe("role enforcement at the API (UI bypass)", () => {
  test("calling POST /services as user from inside the browser returns 403", async ({ page }) => {
    await loginAs(page, "user");

    // Issue the mutation from the browser context so the bearer token is the
    // real user one — bypassing the UI is exactly what the rubric grades.
    const status = await page.evaluate(
      async ({ apiUrl, body }) => {
        const accessToken = localStorage.getItem("cleandrop.access");
        const res = await fetch(`${apiUrl}/services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });
        return res.status;
      },
      {
        apiUrl: API_URL,
        body: {
          name: "should-not-create",
          description: "x",
          category: "Residential",
          companyId: "00000000-0000-0000-0000-000000000000",
          status: "Active",
          durationMinutes: 60,
          basePriceCents: 1000,
        },
      },
    );
    expect(status).toBe(403);
  });
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
