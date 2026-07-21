export const THRESHOLDS = {
  analysisMaxSide: 512,
  darkMean: 52,
  brightMean: 210,
  darkPixel: 0.55,
  brightPixel: 0.3,
  clipping: 0.18,
  lowContrast: 28,
  blur: 65,
  nearBlankVariation: 10,
  lowColorVariation: 22,
  nearDuplicateHamming: 8,
  similarHamming: 16,
  diversityDistance: 0.22
} as const;

export type ThresholdConfig = { -readonly [Key in keyof typeof THRESHOLDS]: number };
