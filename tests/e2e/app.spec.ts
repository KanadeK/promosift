import { test, expect } from "@playwright/test";
test("loads samples, filters, shortlists, switches language and resets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Curate the evidence/i })).toBeVisible();
  await page
    .locator("#files")
    .setInputFiles([
      "tests/fixtures/clear-1920x1080.png",
      "tests/fixtures/black-frame.png",
      "tests/fixtures/exact-duplicate-a.png"
    ]);
  await expect(page.getByText(/images/).first()).toContainText("3");
  await page.getByRole("button", { name: "Keep" }).first().click();
  await expect(page.getByText(/Shortlist board/)).toContainText("1/");
  await page.getByRole("button", { name: "中文" }).click();
  await expect(page.getByText("本地")).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText(/Import a local folder/)).toBeVisible();
});
