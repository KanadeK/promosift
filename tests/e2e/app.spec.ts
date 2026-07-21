import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import JSZip from "jszip";

test("imports PNG, JPEG, and WebP locally", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("#files")
    .setInputFiles([
      "tests/fixtures/clear-1920x1080.png",
      "tests/fixtures/format-smoke.jpg",
      "tests/fixtures/format-smoke.webp"
    ]);
  await expect(page.locator(".card")).toHaveCount(3);
  await expect(page.locator(".stats")).toContainText("3/3");
});

test("remains usable at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Curate the evidence/i })).toBeVisible();
  await page.locator("#files").setInputFiles("tests/fixtures/clear-1920x1080.png");
  await expect(page.locator(".card")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("reports invalid image content instead of importing it", async ({ page }) => {
  await page.goto("/");
  await page.locator("#files").setInputFiles("public/samples/extension-mismatch.jpg");
  await expect(page.getByRole("alert")).toContainText("file content does not match its image type");
  await expect(page.locator(".card")).toHaveCount(0);
});

test("shows visual duplicate groups and keeps only the chosen candidate", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("#files")
    .setInputFiles(["tests/fixtures/near-duplicate-a.png", "tests/fixtures/near-duplicate-b.png"]);
  await expect(page.locator(".stats")).toContainText("2/2");
  const group = page.locator(".group");
  await expect(group).toContainText("near-duplicate-a.png");
  await expect(group).toContainText("near-duplicate-b.png");
  await expect(group).toContainText(/VISUAL_(NEAR_DUPLICATE|SIMILAR)/);
  await group.getByRole("button").first().click();
  await expect(page.getByText(/Shortlist board/)).toContainText("1/");
});

test("cancels a queued analysis batch without finishing every image", async ({ page }) => {
  const files = (await readdir("tests/fixtures/performance"))
    .slice(0, 100)
    .map((file) => `tests/fixtures/performance/${file}`);
  await page.goto("/");
  await page.locator("#files").setInputFiles(files);
  const cancel = page.getByRole("button", { name: "Cancel analysis" });
  await expect(cancel).toBeEnabled();
  await cancel.dispatchEvent("click");
  await expect(cancel).toBeDisabled();
  await page.waitForTimeout(500);
  await expect(page.locator(".stats")).not.toContainText("100/100");
});

test("keeps the full local workflow private and exports a ZIP", async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173") externalRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Curate the evidence/i })).toBeVisible();
  await page
    .locator("#files")
    .setInputFiles([
      "tests/fixtures/clear-1920x1080.png",
      "tests/fixtures/black-frame.png",
      "tests/fixtures/exact-duplicate-a.png"
    ]);
  await expect(page.locator(".stats")).toContainText("2");
  await expect(page.locator(".stats")).toContainText("2/2");
  await expect(page.getByRole("alert")).toContainText("exact-duplicate-a.png: already imported.");
  const blackCard = page.locator(".card").filter({ hasText: "black-frame.png" });
  await expect(blackCard).toContainText("TOO_DARK");
  await page.locator('[data-threshold="darkMean"]').fill("0");
  await page.locator('[data-threshold="darkMean"]').press("Tab");
  await expect(blackCard).not.toContainText("TOO_DARK");
  await page.selectOption("#target", "custom");
  await page.locator("#custom-target").fill("7");
  await page.locator("#custom-target").press("Tab");
  await expect(page.getByText(/Shortlist board/)).toContainText("0/7");
  await page.locator(".image-button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Technical signals")).toBeVisible();
  await page.getByRole("button", { name: "+ Zoom" }).click();
  await expect(page.getByText("125%")).toBeVisible();
  await page.getByRole("button", { name: "Close image detail" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.selectOption("#filter", "flags");
  await expect(page.locator(".card")).toHaveCount(1);
  await page.selectOption("#filter", "all");
  await page
    .locator(".card")
    .filter({ hasText: "clear-1920x1080.png" })
    .getByRole("button", { name: "Keep" })
    .click();
  await page
    .locator(".card")
    .filter({ hasText: "black-frame.png" })
    .getByRole("button", { name: "Keep" })
    .click();
  await expect(page.getByText(/Shortlist board/)).toContainText("2/");
  const shortlist = page.locator(".shortlist [data-drag]");
  await shortlist.nth(1).dragTo(shortlist.nth(0));
  await expect(shortlist.nth(0)).toContainText("black-frame.png");
  const moveDown = shortlist.nth(0).getByRole("button", { name: "Move down" });
  await moveDown.focus();
  await page.keyboard.press("Enter");
  await expect(shortlist.nth(0)).toContainText("clear-1920x1080.png");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ZIP" }).click();
  const zipDownload = await download;
  expect(zipDownload.suggestedFilename()).toBe("promosift-selection.zip");
  const zipPath = testInfo.outputPath("promosift-selection.zip");
  await zipDownload.saveAs(zipPath);
  const zip = await JSZip.loadAsync(await readFile(zipPath));
  expect(Object.keys(zip.files)).toEqual(
    expect.arrayContaining(["selected/", "contact-sheet.png", "selection.json", "report.csv"])
  );
  expect(await zip.file("selected/01-clear-1920x1080.png")!.async("nodebuffer")).toEqual(
    await readFile("tests/fixtures/clear-1920x1080.png")
  );
  expect(await zip.file("report.csv")!.async("string")).toContain("file_name,width,height");
  expect(await zip.file("selection.json")!.async("string")).not.toContain("data:image");
  const projectDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export project JSON" }).click();
  const projectPath = testInfo.outputPath("promosift-project.json");
  await (await projectDownload).saveAs(projectPath);
  await page.locator('[data-action="reset"]').click();
  await page.locator("#project-file").setInputFiles(projectPath);
  await page.locator("#folder").setInputFiles("tests/fixtures/project-recovery");
  const restoredCard = page.locator(".card").filter({ hasText: "clear-1920x1080.png" });
  await expect(restoredCard.getByRole("button", { name: "Keep" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "中文" }).click();
  await expect(page.getByText("本地")).toBeVisible();
  await expect(page.getByRole("button", { name: "保留" }).first()).toBeVisible();
  await page.locator('[data-action="theme"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator('[data-action="theme"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator('[data-action="theme"]').click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await page.locator('[data-action="reset"]').click();
  await expect(page.getByText(/Import a local folder/)).toBeVisible();
  expect(externalRequests).toEqual([]);
});
