import type { ImportSource, Screenshot } from "./types";

const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
export const LIMITS = { count: 500, bytes: 50 * 1024 * 1024, warningBytes: 2 * 1024 * 1024 * 1024 };

export async function validateAndCreate(file: File, source: ImportSource): Promise<Screenshot> {
  if (!allowed.has(file.type))
    throw new Error(`${file.name}: only PNG, JPEG, and WebP are supported.`);
  if (file.size > LIMITS.bytes)
    throw new Error(`${file.name}: files must be no larger than 50 MB.`);
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid =
    (file.type === "image/png" && header[0] === 137 && header[1] === 80) ||
    (file.type === "image/jpeg" && header[0] === 255 && header[1] === 216) ||
    (file.type === "image/webp" &&
      String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...header.slice(8, 12)) === "WEBP");
  if (!valid) throw new Error(`${file.name}: file content does not match its image type.`);
  const contentHash = await hashFile(file);
  return {
    id: crypto.randomUUID(),
    file,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    width: 0,
    height: 0,
    aspectRatio: 0,
    objectUrl: URL.createObjectURL(file),
    importSource: source,
    analysisStatus: "queued",
    contentHash,
    brightnessMean: 0,
    brightnessStdDev: 0,
    darkPixelRatio: 0,
    brightPixelRatio: 0,
    contrastScore: 0,
    blurScore: 0,
    colorVariation: 0,
    histogram: [],
    dHash: "0000000000000000",
    qualityFlags: [],
    selectionStatus: "unreviewed"
  };
}

export async function hashFile(file: File): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
