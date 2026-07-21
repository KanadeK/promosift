import type { Screenshot } from "../core/types";
export function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function buildCsv(images: Screenshot[]): string {
  const columns = [
    "file_name",
    "width",
    "height",
    "aspect_ratio",
    "size_bytes",
    "blur_score",
    "brightness_mean",
    "contrast_score",
    "duplicate_group",
    "quality_flags",
    "selection_status",
    "shortlist_order"
  ];
  const rows = images.map((i) =>
    [
      i.fileName,
      i.width,
      i.height,
      i.aspectRatio.toFixed(4),
      i.sizeBytes,
      i.blurScore.toFixed(2),
      i.brightnessMean.toFixed(2),
      i.contrastScore.toFixed(2),
      i.duplicateGroupId ?? "",
      i.qualityFlags.join("|"),
      i.selectionStatus,
      i.shortlistOrder ?? ""
    ]
      .map(csvEscape)
      .join(",")
  );
  return `${columns.join(",")}\n${rows.join("\n")}\n`;
}
