/// <reference lib="webworker" />
import { measurePixels } from "../core/quality-metrics";
import { THRESHOLDS } from "../core/thresholds";
import type { WorkerInput, WorkerOutput } from "../core/types";

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  try {
    const bitmap = await createImageBitmap(event.data.file);
    const sourceWidth = bitmap.width,
      sourceHeight = bitmap.height;
    const scale = Math.min(1, THRESHOLDS.analysisMaxSide / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale)),
      height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = new OffscreenCanvas(width, height),
      context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const result: WorkerOutput = {
      id: event.data.id,
      width: sourceWidth,
      height: sourceHeight,
      metrics: measurePixels(context.getImageData(0, 0, width, height).data, width, height)
    };
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      id: event.data.id,
      message: error instanceof Error ? error.message : "Unable to decode image"
    });
  }
};
