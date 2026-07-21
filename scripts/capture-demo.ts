import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto("http://127.0.0.1:4173/promosift/", { waitUntil: "domcontentloaded" });
await mkdir(join(root, "docs", "screenshots"), { recursive: true });
await page
  .locator("#files")
  .setInputFiles([
    join(root, "public", "samples", "clear-1920x1080.png"),
    join(root, "public", "samples", "blurry.png"),
    join(root, "public", "samples", "black-frame.png"),
    join(root, "public", "samples", "pixel-art.png")
  ]);
await page.waitForTimeout(1_000);
await page.screenshot({ path: join(root, "docs", "screenshots", "gallery.png"), fullPage: true });
await page.selectOption("#filter", "flags");
await page.screenshot({
  path: join(root, "docs", "screenshots", "quality-filter.png"),
  fullPage: true
});
await page.selectOption("#filter", "duplicates");
await page.screenshot({
  path: join(root, "docs", "screenshots", "duplicate-group.png"),
  fullPage: true
});
await page.selectOption("#filter", "all");
for (const button of await page.getByRole("button", { name: "Keep" }).all()) await button.click();
await page.screenshot({ path: join(root, "docs", "screenshots", "shortlist.png"), fullPage: true });
await page.getByRole("button", { name: "Download contact sheet" }).click();
await page.screenshot({
  path: join(root, "docs", "screenshots", "contact-sheet.png"),
  fullPage: true
});
await browser.close();
