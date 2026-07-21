import type { Preset, Screenshot } from "../core/types";
export function buildProject(images: Screenshot[], preset: Preset): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      preset,
      images: images.map((image) => ({
        id: image.id,
        fileName: image.fileName,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        width: image.width,
        height: image.height,
        aspectRatio: image.aspectRatio,
        importSource: image.importSource,
        analysisStatus: image.analysisStatus,
        contentHash: image.contentHash,
        brightnessMean: image.brightnessMean,
        brightnessStdDev: image.brightnessStdDev,
        darkPixelRatio: image.darkPixelRatio,
        brightPixelRatio: image.brightPixelRatio,
        contrastScore: image.contrastScore,
        blurScore: image.blurScore,
        colorVariation: image.colorVariation,
        histogram: image.histogram,
        dHash: image.dHash,
        qualityFlags: image.qualityFlags,
        selectionStatus: image.selectionStatus,
        shortlistOrder: image.shortlistOrder
      }))
    },
    null,
    2
  );
}
