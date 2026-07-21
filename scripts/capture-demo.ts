import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
console.log(`Capturing PromoSift demo assets in ${root}`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.on("pageerror", (error) => console.error(`Page error: ${error.message}`));
page.on(
  "console",
  (message) => message.type() === "error" && console.error(`Console error: ${message.text()}`)
);
await page.goto("http://127.0.0.1:4173/promosift/", { waitUntil: "domcontentloaded" });
console.log(`Loaded preview; file picker count: ${await page.locator("#files").count()}`);
await mkdir(join(root, "docs", "screenshots"), { recursive: true });
await page.locator("#files").setInputFiles([join(root, "public", "samples", "black-frame.png")]);
await page.waitForTimeout(1_000);
await page.screenshot({ path: join(root, "docs", "screenshots", "gallery.png") });
console.log("Captured gallery");
await page.selectOption("#filter", "flags");
await page.screenshot({
  path: join(root, "docs", "screenshots", "quality-filter.png"),
  fullPage: false
});
console.log("Captured quality filter");
await page.selectOption("#filter", "duplicates");
await page.screenshot({
  path: join(root, "docs", "screenshots", "duplicate-group.png"),
  fullPage: false
});
console.log("Captured duplicate group");
await page.selectOption("#filter", "all");
for (const button of await page.getByRole("button", { name: "Keep" }).all()) await button.click();
await page.screenshot({ path: join(root, "docs", "screenshots", "shortlist.png") });
console.log("Captured shortlist");
await page.getByRole("button", { name: "Download contact sheet" }).click();
await page.screenshot({
  path: join(root, "docs", "screenshots", "contact-sheet.png"),
  fullPage: false
});
console.log("Captured contact sheet");
await browser.close();
console.log("Demo capture complete");
