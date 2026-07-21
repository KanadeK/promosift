import { evaluatePreset } from "./presets";
import { clusterDuplicates } from "./duplicate-cluster";
import { qualityFlagsFromMetrics } from "./quality-metrics";
import type { ThresholdConfig } from "./thresholds";
import type { Preset, Screenshot, WorkerOutput } from "./types";

export function applyAnalysis(
  images: Screenshot[],
  result: WorkerOutput,
  preset: Preset,
  thresholds: ThresholdConfig
): Screenshot[] {
  return clusterDuplicates(
    images.map((image) =>
      image.id !== result.id
        ? image
        : {
            ...image,
            width: result.width,
            height: result.height,
            aspectRatio: result.width / result.height,
            ...result.metrics,
            qualityFlags: qualityFlagsFromMetrics(result.metrics, thresholds),
            specStatus: evaluatePreset(result.width, result.height, preset),
            analysisStatus: "done"
          }
    )
  );
}
