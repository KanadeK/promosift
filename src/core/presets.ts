import type { Preset, SpecStatus } from "./types";

export const PRESETS: Preset[] = [
  {
    id: "steam",
    name: "Steam Store Screenshot",
    targetWidth: 16,
    targetHeight: 9,
    minimumWidth: 1920,
    minimumHeight: 1080,
    aspectTolerance: 0.015
  },
  {
    id: "16:9",
    name: "Generic 16:9",
    targetWidth: 16,
    targetHeight: 9,
    minimumWidth: 0,
    minimumHeight: 0,
    aspectTolerance: 0.02
  },
  {
    id: "4:3",
    name: "Generic 4:3",
    targetWidth: 4,
    targetHeight: 3,
    minimumWidth: 0,
    minimumHeight: 0,
    aspectTolerance: 0.02
  },
  {
    id: "custom",
    name: "Custom",
    targetWidth: 16,
    targetHeight: 9,
    minimumWidth: 0,
    minimumHeight: 0,
    aspectTolerance: 0.02
  }
];

export function evaluatePreset(width: number, height: number, preset: Preset): SpecStatus {
  if (!width || !height || height > width) return "FAIL";
  if (width < preset.minimumWidth || height < preset.minimumHeight) return "FAIL";
  const delta = Math.abs(width / height - preset.targetWidth / preset.targetHeight);
  return delta <= preset.aspectTolerance
    ? "PASS"
    : delta <= preset.aspectTolerance * 3
      ? "WARNING"
      : "FAIL";
}
