import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";

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
  await page.getByRole("button", { name: "Keep" }).first().click();
  await expect(page.getByText(/Shortlist board/)).toContainText("1/");
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
