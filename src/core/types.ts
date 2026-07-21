export type ImportSource = "picker" | "folder" | "drop" | "clipboard" | "sample";
export type AnalysisStatus = "queued" | "analyzing" | "done" | "error" | "cancelled";
export type SelectionStatus = "unreviewed" | "keep" | "maybe" | "reject";
export type QualityFlag =
  | "SUSPECTED_BLUR"
  | "TOO_DARK"
  | "TOO_BRIGHT"
  | "SHADOW_CLIPPING"
  | "HIGHLIGHT_CLIPPING"
  | "LOW_CONTRAST"
  | "NEAR_BLANK"
  | "LOW_COLOR_VARIATION";
export type SpecStatus = "PASS" | "WARNING" | "FAIL";

export interface Metrics {
  brightnessMean: number;
  brightnessStdDev: number;
  darkPixelRatio: number;
  brightPixelRatio: number;
  contrastScore: number;
  blurScore: number;
  colorVariation: number;
  histogram: number[];
  dHash: string;
  qualityFlags: QualityFlag[];
}

export interface Screenshot extends Metrics {
  id: string;
  file: File;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  aspectRatio: number;
  objectUrl: string;
  importSource: ImportSource;
  analysisStatus: AnalysisStatus;
  contentHash: string;
  duplicateGroupId?: string;
  duplicateKind?: "EXACT_FILE_DUPLICATE" | "VISUAL_NEAR_DUPLICATE" | "VISUALLY_SIMILAR";
  selectionStatus: SelectionStatus;
  shortlistOrder?: number;
  specStatus?: SpecStatus;
}

export interface Preset {
  id: "steam" | "16:9" | "4:3" | "custom";
  name: string;
  targetWidth: number;
  targetHeight: number;
  minimumWidth: number;
  minimumHeight: number;
  aspectTolerance: number;
}

export interface WorkerInput {
  id: string;
  file: File;
}
export interface WorkerOutput {
  id: string;
  width: number;
  height: number;
  metrics: Metrics;
}
