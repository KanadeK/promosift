import { describe, expect, it } from "vitest";
import { evaluatePreset, PRESETS } from "../../src/core/presets";
import { dHash, hammingDistance } from "../../src/core/perceptual-hash";
import { measurePixels } from "../../src/core/quality-metrics";
import { histogramDistance } from "../../src/core/diversity";
import { csvEscape } from "../../src/export/csv-exporter";
import { safeName } from "../../src/export/zip-exporter";

describe("technical analysis primitives", () => {
  it("evaluates Steam dimensions and ratio", () => {
    expect(evaluatePreset(1920, 1080, PRESETS[0])).toBe("PASS");
    expect(evaluatePreset(1280, 720, PRESETS[0])).toBe("FAIL");
    expect(evaluatePreset(1600, 1200, PRESETS[0])).toBe("FAIL");
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
  it("calculates symmetric histogram distance", () => {
    expect(histogramDistance([1, 0], [0, 1])).toBeCloseTo(Math.sqrt(2));
    expect(histogramDistance([0.5, 0.5], [0.5, 0.5])).toBe(0);
  });
  it("escapes CSV and sanitizes output names", () => {
    expect(csvEscape('a,"b"')).toBe('"a,""b"""');
    expect(safeName("bad:name?.png")).toBe("bad_name_.png");
  });
});
