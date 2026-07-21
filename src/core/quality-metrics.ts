import { THRESHOLDS } from "./thresholds";
import { dHash } from "./perceptual-hash";
import type { Metrics, QualityFlag } from "./types";

export function measurePixels(data: Uint8ClampedArray, width: number, height: number): Metrics {
  const count = width * height;
  const lum = new Uint8ClampedArray(count);
  const histogram = Array<number>(64).fill(0);
  let sum = 0,
    sumSq = 0,
    dark = 0,
    bright = 0,
    rSum = 0,
    gSum = 0,
    bSum = 0;
  for (let p = 0, i = 0; i < data.length; i += 4, p += 1) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const value = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    lum[p] = value;
    sum += value;
    sumSq += value * value;
    rSum += r;
    gSum += g;
    bSum += b;
    if (value < 32) dark += 1;
    if (value > 224) bright += 1;
    histogram[(r >> 6) * 16 + (g >> 6) * 4 + (b >> 6)] += 1;
  }
  const brightnessMean = sum / count;
  const brightnessStdDev = Math.sqrt(Math.max(0, sumSq / count - brightnessMean ** 2));
  const colorVariation =
    data.reduce(
      (acc, v, index) =>
        index % 4 === 3
          ? acc
          : acc + Math.abs(v - [rSum / count, gSum / count, bSum / count][index % 4]),
      0
    ) /
    (count * 3);
  let laplaceSum = 0,
    laplaceSq = 0,
    laplaceN = 0;
  for (let y = 1; y < height - 1; y += 1)
    for (let x = 1; x < width - 1; x += 1) {
      const c = y * width + x;
      const value = 4 * lum[c] - lum[c - 1] - lum[c + 1] - lum[c - width] - lum[c + width];
      laplaceSum += value;
      laplaceSq += value * value;
      laplaceN += 1;
    }
  const blurScore = laplaceN ? laplaceSq / laplaceN - (laplaceSum / laplaceN) ** 2 : 0;
  const flags: QualityFlag[] = [];
  if (blurScore < THRESHOLDS.blur) flags.push("SUSPECTED_BLUR");
  if (brightnessMean < THRESHOLDS.darkMean) flags.push("TOO_DARK");
  if (brightnessMean > THRESHOLDS.brightMean) flags.push("TOO_BRIGHT");
  if (dark / count > THRESHOLDS.clipping) flags.push("SHADOW_CLIPPING");
  if (bright / count > THRESHOLDS.clipping) flags.push("HIGHLIGHT_CLIPPING");
  if (brightnessStdDev < THRESHOLDS.lowContrast) flags.push("LOW_CONTRAST");
  if (colorVariation < THRESHOLDS.nearBlankVariation) flags.push("NEAR_BLANK");
  else if (colorVariation < THRESHOLDS.lowColorVariation) flags.push("LOW_COLOR_VARIATION");
  return {
    brightnessMean,
    brightnessStdDev,
    darkPixelRatio: dark / count,
    brightPixelRatio: bright / count,
    contrastScore: brightnessStdDev,
    blurScore,
    colorVariation,
    histogram: histogram.map((v) => v / count),
    dHash: dHash(resizeLuminance(lum, width, height), 9, 8),
    qualityFlags: flags
  };
}

function resizeLuminance(
  source: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(72);
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 9; x += 1)
      out[y * 9 + x] =
        source[Math.floor(((y + 0.5) * height) / 8) * width + Math.floor(((x + 0.5) * width) / 9)];
  return out;
}
