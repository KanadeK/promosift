import { deflateSync } from "node:zlib";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "public", "samples");
const testOut = join(root, "tests", "fixtures");
const projectFolder = join(testOut, "project-recovery");
const formatSmokeJpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYyLjI4LjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABLAAEBAAAAAAAAAAAAAAAAAAAAAwEBAAAAAAAAAAAAAAAAAAAABhABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/AABEIAAkAEAMBIgACEQADEQD/2gAMAwEAAhEDEQA/AKgGgo//2Q==",
  "base64"
);
const formatSmokeWebp = Buffer.from(
  "UklGRjYAAABXRUJQVlA4ICoAAADwAQCdASoQAAkAAgA0JaACdLoB+AAF9AAA2m/8zRMcx+1f/5BcsLriMAA=",
  "base64"
);
type Kind = "clear" | "blur" | "dark" | "bright" | "low" | "black" | "white" | "pixel" | "night";
const manifest: [string, number, number, Kind][] = [
  ["clear-1920x1080.png", 1920, 1080, "clear"],
  ["clear-2560x1440.png", 2560, 1440, "clear"],
  ["blurry.png", 1920, 1080, "blur"],
  ["very-dark.png", 1920, 1080, "dark"],
  ["very-bright.png", 1920, 1080, "bright"],
  ["low-contrast.png", 1920, 1080, "low"],
  ["black-frame.png", 1920, 1080, "black"],
  ["white-frame.png", 1920, 1080, "white"],
  ["wrong-ratio-4x3.png", 1600, 1200, "clear"],
  ["portrait.png", 1080, 1920, "clear"],
  ["small-1280x720.png", 1280, 720, "clear"],
  ["exact-duplicate-a.png", 1920, 1080, "clear"],
  ["exact-duplicate-b.png", 1920, 1080, "clear"],
  ["near-duplicate-a.png", 1920, 1080, "night"],
  ["near-duplicate-b.png", 1920, 1080, "night"],
  ["pixel-art.png", 1920, 1080, "pixel"],
  ["night-scene.png", 1920, 1080, "night"],
  ["中文 截图.png", 1920, 1080, "clear"],
  ["space name.png", 1920, 1080, "clear"],
  [
    "this-is-an-intentionally-long-synthetic-promosift-fixture-name-for-testing-export-sanitization-and-browser-file-handling-without-any-commercial-game-assets.png",
    1920,
    1080,
    "clear"
  ]
];
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const part = Buffer.alloc(12 + data.length);
  part.writeUInt32BE(data.length, 0);
  part.write(type, 4);
  Buffer.from(data).copy(part, 8);
  part.writeUInt32BE(crc32(part.subarray(4, 8 + data.length)), 8 + data.length);
  return part;
}
function png(width: number, height: number, kind: Kind, tweak = 0): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      const wave = (x * 7 + y * 11 + tweak) % 256;
      let r = wave,
        g = (x * 3 + y * 5 + tweak) % 256,
        b = (x * 5 + y * 2 + tweak) % 256;
      if (kind === "blur") {
        const value = 100 + (Math.floor((x + y) / 200) % 30);
        r = value;
        g = value + 3;
        b = value + 6;
      }
      if (kind === "dark" || kind === "night") {
        r = Math.floor(r * 0.18);
        g = Math.floor(g * 0.22);
        b = Math.floor(b * 0.42);
      }
      if (kind === "bright") {
        r = 220 + (r % 35);
        g = 220 + (g % 35);
        b = 220 + (b % 35);
      }
      if (kind === "low") {
        r = 128 + (r % 12);
        g = 128 + (g % 12);
        b = 128 + (b % 12);
      }
      if (kind === "black") r = g = b = 0;
      if (kind === "white") r = g = b = 255;
      if (kind === "pixel") {
        const value = ((Math.floor(x / 36) + Math.floor(y / 36)) % 2) * 230;
        r = value;
        g = 45 + value / 3;
        b = 95;
      }
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
await mkdir(out, { recursive: true });
await mkdir(testOut, { recursive: true });
await mkdir(projectFolder, { recursive: true });
for (const [name, width, height, kind] of manifest) {
  const target = join(out, name);
  const source = name === "exact-duplicate-b.png" ? join(out, "exact-duplicate-a.png") : null;
  if (source) await copyFile(source, target);
  else await writeFile(target, png(width, height, kind, name === "near-duplicate-b.png" ? 4 : 0));
}
await writeFile(join(out, "this-is-not-an-image.png"), "not an image");
await writeFile(join(out, "extension-mismatch.jpg"), png(64, 64, "clear"));
await writeFile(join(out, "format-smoke.jpg"), formatSmokeJpeg);
await writeFile(join(out, "format-smoke.webp"), formatSmokeWebp);
for (const name of [
  "clear-1920x1080.png",
  "small-1280x720.png",
  "wrong-ratio-4x3.png",
  "black-frame.png",
  "exact-duplicate-a.png",
  "exact-duplicate-b.png",
  "near-duplicate-a.png",
  "near-duplicate-b.png"
])
  await copyFile(join(out, name), join(testOut, name));
for (const name of ["format-smoke.jpg", "format-smoke.webp"])
  await copyFile(join(out, name), join(testOut, name));
for (const name of ["clear-1920x1080.png", "black-frame.png"])
  await copyFile(join(out, name), join(projectFolder, name));
console.log(`Generated ${manifest.length} original synthetic image fixtures.`);
