import { describe, expect, it } from "vitest";
import { clusterDuplicates } from "../../src/core/duplicate-cluster";
import type { Screenshot } from "../../src/core/types";
const base = (id: string, hash: string, dHash: string): Screenshot => ({
  id,
  file: new File(["x"], `${id}.png`, { type: "image/png" }),
  fileName: `${id}.png`,
  mimeType: "image/png",
  sizeBytes: 1,
  width: 1920,
  height: 1080,
  aspectRatio: 16 / 9,
  objectUrl: "",
  importSource: "picker",
  analysisStatus: "done",
  contentHash: hash,
  brightnessMean: 120,
  brightnessStdDev: 40,
  darkPixelRatio: 0,
  brightPixelRatio: 0,
  contrastScore: 40,
  blurScore: 100,
  colorVariation: 50,
  histogram: Array(64).fill(0),
  dHash,
  qualityFlags: [],
  selectionStatus: "unreviewed"
});
describe("duplicate clustering", () => {
  it("groups exact files and visual-near files", () => {
    const results = clusterDuplicates([
      base("a", "same", "0000000000000000"),
      base("b", "same", "0000000000000000"),
      base("c", "other", "0000000000000001")
    ]);
    expect(results[0].duplicateGroupId).toBeTruthy();
    expect(results[1].duplicateKind).toBe("EXACT_FILE_DUPLICATE");
    expect(results[2].duplicateKind).toBe("VISUAL_NEAR_DUPLICATE");
  });
});
