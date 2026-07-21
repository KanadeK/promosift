import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
await access(join(root, "dist", "index.html"));
const assets = await readdir(join(root, "dist", "assets"));
if (!assets.some((asset) => asset.endsWith(".js")))
  throw new Error("Build has no JavaScript assets.");
console.log("Build verification passed.");
