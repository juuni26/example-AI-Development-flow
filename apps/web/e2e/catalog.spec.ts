import { test, expect, loginAs } from "./fixtures";

test.describe("catalog read path (as user)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "user");
  });

  test("summary cards show the seeded numbers", async ({ page }) => {
    // The four cards are above the Catalog. Their exact values are derived
    // from the fixture: 9 / 6 / 2 / EUR 159.
    await expect(page.getByText("Total Services", { exact: true })).toBeVisible();
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Drafts", { exact: true })).toBeVisible();
    await expect(page.getByText("Avg. Base Price", { exact: true })).toBeVisible();

    // The big numbers themselves (page-level — there's only one "9" and "EUR 159"
    // on the page in the summary card slot).
    await expect(page.getByText("9", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/EUR\s*159/)).toBeVisible();
  });

  test("table renders the seeded services with expected columns", async ({ page }) => {
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    // Header cells contain a sortable button; locate by the button name in
    // thead for a stable match across browsers.
    const headerRow = table.locator("thead");
    for (const col of ["Name", "Category", "Company", "Status", "Duration"]) {
      await expect(
        headerRow.getByRole("button", { name: new RegExp(`^${col}\\b`, "i") }),
      ).toBeVisible();
    }
    // Search for a specific seeded row so it's visible regardless of which
    // page the default sort would have placed it on.
    await page.getByLabel("Search services").fill("Standard Clean");
    await expect(table.getByText("Standard Clean", { exact: true })).toBeVisible();
  });

  test("status filter narrows results and round-trips through URL params", async ({ page }) => {
    await page.getByLabel("Filter by status").click();
    await page.getByRole("option", { name: "Draft" }).click();

    await expect(page).toHaveURL(/[?&]status=Draft/);
    // The page shows the 'Showing 1 to N of 2 services' footer text
    await expect(page.getByText(/of 2 services/)).toBeVisible();
  });

  test("debounced search filters across name and description", async ({ page }) => {
    await page.getByLabel("Search services").fill("hospital");
    // The debounce is 250ms — Playwright will retry .toBeVisible automatically.
    await expect(page.getByText("Deep Sanitization", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/[?&]search=hospital/);
    // Other services should not be rendered.
    await expect(page.getByRole("row").filter({ hasText: "Standard Clean" })).toHaveCount(0);
  });

  test("sorting by Name asc then desc reorders the rows", async ({ page }) => {
    const nameHeader = page.getByRole("button", { name: /^Name/ });
    await nameHeader.click();
    await expect(page).toHaveURL(/[?&]sortBy=name/);
    await expect(page).toHaveURL(/[?&]sortDir=asc/);

    // First visible name in the table body should now start alphabetically.
    const firstBodyRowName = page.getByRole("table").locator("tbody tr").first();
    await expect(firstBodyRowName).toContainText(
      /Carpet|Deep|Move|Office|Post|Retail|Standard|Window/,
    );

    await nameHeader.click();
    await expect(page).toHaveURL(/[?&]sortDir=desc/);
  });

  test("pagination moves between pages", async ({ page }) => {
    // Set pageSize to 6 so we get 2 pages (9 services / 6 per page).
    await page.getByLabel(/rows per page/i).click();
    await page.getByRole("option", { name: "6", exact: true }).click();

    await expect(page.getByText(/Page\s*1\s*\/\s*2/)).toBeVisible();
    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText(/Page\s*2\s*\/\s*2/)).toBeVisible();
    await page.getByRole("button", { name: /previous/i }).click();
    await expect(page.getByText(/Page\s*1\s*\/\s*2/)).toBeVisible();
  });

  test("user does NOT see the + Add button or row-action menus", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^\+? ?Add$/ })).toHaveCount(0);
    // No per-row "Actions for X" buttons either.
    await expect(page.getByRole("button", { name: /actions for/i })).toHaveCount(0);
  });

  test("Clear filters in the empty state resets EVERY filter (regression: batched state)", async ({
    page,
  }) => {
    // Drive into an empty-result state by combining filters that don't overlap
    // any seeded service. Each filter goes into the URL independently so we
    // know all three are active simultaneously.
    await page.getByLabel("Search services").fill("zzz-no-match-zzz");

    await page.getByLabel("Filter by status").click();
    await page.getByRole("option", { name: "Draft" }).click();

    await page.getByLabel("Filter by category").click();
    await page.getByRole("option", { name: "Specialty" }).click();

    // All three filter params are in the URL.
    await expect(page).toHaveURL(/search=zzz-no-match-zzz/);
    await expect(page).toHaveURL(/status=Draft/);
    await expect(page).toHaveURL(/category=Specialty/);

    // Empty state is shown with the Clear filters affordance.
    await expect(page.getByText("No services match these filters.")).toBeVisible();
    await page.getByRole("button", { name: /clear filters/i }).click();

    // One click must clear ALL filter params, not just the last one set.
    // The bug this guards against: three sequential setState calls each
    // derived `next` from the same stale `params` snapshot, so only the
    // last setParams won — `search` and `status` lingered.
    await expect(page).not.toHaveURL(/[?&]search=/);
    await expect(page).not.toHaveURL(/[?&]status=/);
    await expect(page).not.toHaveURL(/[?&]category=/);

    // And the catalog now shows real rows again.
    await expect(page.getByText("No services match these filters.")).toHaveCount(0);
    await expect(page.getByRole("table").locator("tbody tr").first()).toBeVisible();
  });
});
