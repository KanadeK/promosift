import JSZip from "jszip";
import { buildCsv } from "./csv-exporter";
import { createContactSheet } from "./contact-sheet";
import type { Screenshot } from "../core/types";

export async function createSelectionZip(
  images: Screenshot[],
  rename: boolean,
  columns: number
): Promise<Blob> {
  const selected = images
    .filter((image) => image.selectionStatus === "keep")
    .sort((a, b) => (a.shortlistOrder ?? Infinity) - (b.shortlistOrder ?? Infinity));
  if (!selected.length) throw new Error("Mark at least one screenshot as Keep before exporting.");
  const zip = new JSZip(),
    folder = zip.folder("selected")!;
  selected.forEach((image, index) =>
    folder.file(
      rename
        ? `${String(index + 1).padStart(2, "0")}-${safeName(image.fileName)}`
        : safeName(image.fileName),
      image.file
    )
  );
  zip.file("contact-sheet.png", await createContactSheet(selected, columns));
  zip.file(
    "selection.json",
    JSON.stringify(
      selected.map((image) => ({
        fileName: image.fileName,
        width: image.width,
        height: image.height,
        qualityFlags: image.qualityFlags,
        selectionStatus: image.selectionStatus,
        shortlistOrder: image.shortlistOrder
      })),
      null,
      2
    )
  );
  zip.file("report.csv", buildCsv(images));
  zip.file(
    "README.txt",
    "PromoSift export. Original selected image bytes are included unchanged. Quality scores are technical heuristics, not aesthetic judgments.\n"
  );
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
export function safeName(name: string): string {
  return (
    [...name]
      .filter((character) => character.charCodeAt(0) >= 32)
      .join("")
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/^\.+/, "_")
      .slice(0, 180) || "image"
  );
}
