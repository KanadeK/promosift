import { describe, expect, it } from "vitest";
import { evaluatePreset, PRESETS } from "../../src/core/presets";
import { dHash, hammingDistance } from "../../src/core/perceptual-hash";
import { measurePixels, qualityFlagsFromMetrics } from "../../src/core/quality-metrics";
import { THRESHOLDS } from "../../src/core/thresholds";
import { histogramDistance } from "../../src/core/diversity";
import { csvEscape } from "../../src/export/csv-exporter";
import { safeName } from "../../src/export/zip-exporter";
import { buildProject } from "../../src/export/project-exporter";
import type { Screenshot } from "../../src/core/types";

describe("technical analysis primitives", () => {
  it("evaluates Steam dimensions and ratio", () => {
    expect(evaluatePreset(1920, 1080, PRESETS[0])).toBe("PASS");
    expect(evaluatePreset(1280, 720, PRESETS[0])).toBe("FAIL");
    expect(evaluatePreset(1600, 1200, PRESETS[0])).toBe("FAIL");
  });
  it("evaluates a configurable Custom preset", () => {
    const custom = {
      ...PRESETS.find((preset) => preset.id === "custom")!,
      targetWidth: 3,
      targetHeight: 2,
      minimumWidth: 1200,
      minimumHeight: 800,
      aspectTolerance: 0.01
    };
    expect(evaluatePreset(1500, 1000, custom)).toBe("PASS");
    expect(evaluatePreset(1200, 900, custom)).toBe("FAIL");
  });
  it("builds a 64-bit dHash and measures Hamming distance", () => {
    const pixels = new Uint8ClampedArray(72).map((_, i) => i);
    const hash = dHash(pixels, 9, 8);
    expect(hash).toHaveLength(16);
    expect(hammingDistance(hash, hash)).toBe(0);
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });
  it("flags a black frame as near blank", () => {
    const pixels = new Uint8ClampedArray(4 * 16).fill(0);
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
    const metrics = measurePixels(pixels, 4, 4);
    expect(metrics.qualityFlags).toContain("NEAR_BLANK");
    expect(metrics.qualityFlags).toContain("TOO_DARK");
  });
  it("re-evaluates technical review flags with user thresholds", () => {
    expect(
      qualityFlagsFromMetrics(
        {
          blurScore: 20,
          brightnessMean: 30,
          darkPixelRatio: 0.7,
          brightPixelRatio: 0,
          brightnessStdDev: 10,
          colorVariation: 30
        },
        { ...THRESHOLDS, blur: 10, darkMean: 20, clipping: 0.8, lowContrast: 5 }
      )
    ).toEqual([]);
  });
  it("calculates symmetric histogram distance", () => {
    expect(histogramDistance([1, 0], [0, 1])).toBeCloseTo(Math.sqrt(2));
    expect(histogramDistance([0.5, 0.5], [0.5, 0.5])).toBe(0);
  });
  it("escapes CSV and sanitizes output names", () => {
    expect(csvEscape('a,"b"')).toBe('"a,""b"""');
    expect(safeName("bad:name?.png")).toBe("bad_name_.png");
  });
  it("exports a project record without image bytes or device paths", () => {
    const image = {
      id: "x",
      file: new File(["secret"], "sample.png"),
      fileName: "sample.png",
      mimeType: "image/png",
      sizeBytes: 6,
      width: 1,
      height: 1,
      aspectRatio: 1,
      objectUrl: "blob:private",
      importSource: "picker",
      analysisStatus: "done",
      contentHash: "abc",
      brightnessMean: 0,
      brightnessStdDev: 0,
      darkPixelRatio: 0,
      brightPixelRatio: 0,
      contrastScore: 0,
      blurScore: 0,
      colorVariation: 0,
      histogram: [],
      dHash: "0",
      qualityFlags: [],
      selectionStatus: "keep"
    } satisfies Screenshot;
    const result = buildProject([image], PRESETS[0]);
    expect(result).toContain("contentHash");
    expect(result).not.toContain("blob:private");
    expect(result).not.toContain("secret");
  });
});
