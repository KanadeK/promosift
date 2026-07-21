import { applyAnalysis } from "../core/analyzer";
import { averageDiversity, suggestShortlist } from "../core/diversity";
import { LIMITS, validateAndCreate } from "../core/image-loader";
import { evaluatePreset, PRESETS } from "../core/presets";
import type { ImportSource, Preset, Screenshot, WorkerOutput } from "../core/types";
import { buildCsv } from "../export/csv-exporter";
import { createContactSheet } from "../export/contact-sheet";
import { buildProject } from "../export/project-exporter";
import { createSelectionZip } from "../export/zip-exporter";
import { en } from "../i18n/en";
import { zhCN } from "../i18n/zh-CN";

type Language = "en" | "zh";
interface PromoSiftProject {
  version: number;
  preset?: Preset;
  images: Array<{
    contentHash: string;
    selectionStatus?: Screenshot["selectionStatus"];
    shortlistOrder?: number;
  }>;
}
const sampleFiles = [
  "clear-1920x1080.png",
  "clear-2560x1440.png",
  "blurry.png",
  "very-dark.png",
  "very-bright.png",
  "low-contrast.png",
  "black-frame.png",
  "wrong-ratio-4x3.png",
  "portrait.png",
  "small-1280x720.png",
  "exact-duplicate-a.png",
  "exact-duplicate-b.png",
  "near-duplicate-a.png",
  "near-duplicate-b.png",
  "pixel-art.png",
  "night-scene.png"
];

export class PromoSiftApp {
  private root: HTMLElement;
  private images: Screenshot[] = [];
  private preset: Preset = PRESETS[0];
  private language: Language = "en";
  private filter = "all";
  private target = 8;
  private worker = new Worker(new URL("../workers/analyzer.worker.ts", import.meta.url), {
    type: "module"
  });
  private queue: string[] = [];
  private cancelled = false;
  private errors: string[] = [];
  private pendingProject?: {
    preset?: Preset;
    images: Array<{
      contentHash: string;
      selectionStatus?: Screenshot["selectionStatus"];
      shortlistOrder?: number;
    }>;
  };

  constructor(root: HTMLElement) {
    this.root = root;
    this.worker.onmessage = (
      event: MessageEvent<{ ok: boolean; result?: WorkerOutput; id?: string; message?: string }>
    ) => this.receiveAnalysis(event.data);
    this.render();
  }

  private text() {
    return this.language === "en" ? en : zhCN;
  }
  private get shortlist() {
    return this.images
      .filter((image) => image.selectionStatus === "keep")
      .sort((a, b) => (a.shortlistOrder ?? Infinity) - (b.shortlistOrder ?? Infinity));
  }

  private render(): void {
    const t = this.text(),
      done = this.images.filter((i) => i.analysisStatus === "done").length,
      shown = this.images.filter(
        (image) =>
          this.filter === "all" ||
          (this.filter === "flags"
            ? image.qualityFlags.length
            : this.filter === "duplicates"
              ? Boolean(image.duplicateGroupId)
              : image.selectionStatus === this.filter)
      );
    this.root.innerHTML = `<main class="shell"><header><a class="brand" href="#top" aria-label="PromoSift home"><span>⌁</span>PromoSift</a><nav><a href="https://github.com/KanadeK/promosift" target="_blank" rel="noreferrer">GitHub</a><button data-action="language">${this.language === "en" ? "中文" : "English"}</button><button data-action="theme">Theme</button><button data-action="reset">Reset</button></nav></header><section id="top" class="hero"><p class="eyebrow">LOCAL-FIRST SCREENSHOT CURATION</p><h1>Curate the evidence.<br/><em>Keep the original.</em></h1><p>${t.tagline}</p><p class="privacy">${t.privacy}<br/>${t.heuristic}</p></section><section class="import-card"><div><h2>Import screenshots</h2><p>PNG, JPEG, WebP · up to ${LIMITS.count} files · 50 MB each</p><input id="files" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden/><input id="folder" type="file" accept="image/png,image/jpeg,image/webp" webkitdirectory multiple hidden/><button class="primary" data-action="files">Choose files</button><button data-action="folder">Choose folder</button><button data-action="samples">Load sample pack</button><p class="drop" tabindex="0">Drop files or folders here · or paste images from clipboard</p></div><div class="stats"><strong>${this.images.length}</strong><span>images</span><strong>${done}/${this.images.length}</strong><span>analyzed</span><strong>${this.shortlist.length}/${this.target}</strong><span>shortlist</span></div></section>${this.errors.length ? `<aside class="errors" role="alert">${this.errors.map((e) => `<p>${escapeHtml(e)}</p>`).join("")}</aside>` : ""}<section class="toolbar"><label>Preset <select id="preset">${PRESETS.map((p) => `<option value="${p.id}" ${p.id === this.preset.id ? "selected" : ""}>${p.name}</option>`).join("")}</select></label><label>View <select id="filter"><option value="all">All</option><option value="flags">Review suggested</option><option value="duplicates">Duplicates</option><option value="keep">Keep</option><option value="maybe">Maybe</option><option value="reject">Reject</option></select></label><button data-action="cancel" ${this.queue.length ? "" : "disabled"}>Cancel analysis</button><button data-action="suggest" ${this.images.length ? "" : "disabled"}>Suggested shortlist</button><button data-action="export" ${this.shortlist.length ? "" : "disabled"}>Export ZIP</button></section><section class="gallery" aria-live="polite">${shown.length ? shown.map((image) => this.card(image)).join("") : `<div class="empty">Import a local folder, choose files, drag-and-drop, or paste image data to start.</div>`}</section><section class="lower"><article class="panel"><h2>Duplicate groups</h2>${this.groupsHtml()}</article><article class="panel"><h2>Shortlist board <small>${this.shortlist.length}/${this.target}</small></h2><label>Target <select id="target">${[5, 6, 8, 10].map((n) => `<option ${n === this.target ? "selected" : ""}>${n}</option>`).join("")}</select></label><p>${averageDiversity(this.shortlist) < 0.22 && this.shortlist.length > 1 ? "Low visual diversity — many selected screenshots look visually similar." : "Visual diversity looks balanced for the current selection."}</p><ol class="shortlist">${this.shortlist.map((image, index) => `<li draggable="true" data-drag="${image.id}"><img src="${image.objectUrl}" alt="${escapeHtml(image.fileName)}"/><span>${index + 1}. ${escapeHtml(image.fileName)}</span><button data-action="remove" data-id="${image.id}">Remove</button></li>`).join("") || "<li>Mark images Keep to build a manual shortlist.</li>"}</ol><button data-action="contact" ${this.shortlist.length ? "" : "disabled"}>Download contact sheet</button><button data-action="csv" ${this.images.length ? "" : "disabled"}>Download report CSV</button><button data-action="project" ${this.images.length ? "" : "disabled"}>Export project JSON</button></article></section><section class="notes"><h2>How the signals work</h2><p>Technical checks flag resolution, aspect ratio, blur-like Laplacian variance, exposure, contrast, near-blank frames, dHash duplicate similarity, and simple color-histogram diversity. Dark scenes, pixel art, and minimal compositions can be correctly chosen despite a review suggestion. Always review results manually before publishing.</p></section></main>`;
    const importPanel = this.root.querySelector(".import-card > div")!;
    importPanel.insertAdjacentHTML(
      "beforeend",
      '<input id="project-file" type="file" accept="application/json,.json" hidden/><button data-action="project-import">Import project</button>'
    );
    if (this.preset.id === "custom")
      this.root
        .querySelector(".toolbar")!
        .insertAdjacentHTML(
          "afterbegin",
          `<fieldset class="custom-preset"><legend>Custom requirements</legend>${(["targetWidth", "targetHeight", "minimumWidth", "minimumHeight", "aspectTolerance"] as const).map((field) => `<label>${field} <input data-custom="${field}" type="number" min="0" step="0.001" value="${this.preset[field]}"/></label>`).join("")}</fieldset>`
        );
    this.bind();
  }

  private card(image: Screenshot): string {
    const status =
      image.analysisStatus === "done"
        ? `${image.width}×${image.height} · ${formatBytes(image.sizeBytes)}`
        : image.analysisStatus;
    return `<article class="card"><button class="image-button" data-action="detail" data-id="${image.id}"><img src="${image.objectUrl}" alt="Preview of ${escapeHtml(image.fileName)}"/></button><div class="card-info"><strong>${escapeHtml(image.fileName)}</strong><small>${status} · ${image.specStatus ?? "pending"}</small><div class="flags">${image.qualityFlags.map((flag) => `<span>${flag}</span>`).join("")}${image.duplicateGroupId ? `<span>${image.duplicateKind}</span>` : ""}</div><div class="choices"><button data-action="status" data-id="${image.id}" data-status="keep" aria-pressed="${image.selectionStatus === "keep"}">Keep</button><button data-action="status" data-id="${image.id}" data-status="maybe" aria-pressed="${image.selectionStatus === "maybe"}">Maybe</button><button data-action="status" data-id="${image.id}" data-status="reject" aria-pressed="${image.selectionStatus === "reject"}">Reject</button></div></div></article>`;
  }
  private groupsHtml(): string {
    const groups = new Map<string, Screenshot[]>();
    this.images
      .filter((i) => i.duplicateGroupId)
      .forEach((image) =>
        groups.set(image.duplicateGroupId!, [...(groups.get(image.duplicateGroupId!) ?? []), image])
      );
    return groups.size
      ? [...groups.entries()]
          .map(
            ([id, images]) =>
              `<div class="group"><strong>${id} · ${images[0].duplicateKind}</strong><div>${images.map((image) => `<button data-action="only" data-id="${image.id}">${escapeHtml(image.fileName)} (${image.width}×${image.height}, ${image.blurScore.toFixed(0)})</button>`).join("")}</div></div>`
          )
          .join("")
      : "<p>No duplicate groups yet.</p>";
  }

  private bind(): void {
    this.root.querySelector<HTMLInputElement>("#files")!.onchange = (e) =>
      void this.importFiles((e.target as HTMLInputElement).files, "picker");
    this.root.querySelector<HTMLInputElement>("#folder")!.onchange = (e) =>
      void this.importFolder((e.target as HTMLInputElement).files);
    this.root.querySelector<HTMLInputElement>("#project-file")!.onchange = (e) =>
      void this.loadProject((e.target as HTMLInputElement).files?.[0]);
    this.root.querySelector<HTMLSelectElement>("#preset")!.onchange = (e) => {
      this.preset = PRESETS.find((p) => p.id === (e.target as HTMLSelectElement).value)!;
      this.recheckPreset();
      this.render();
    };
    this.root.querySelectorAll<HTMLInputElement>("[data-custom]").forEach((input) => {
      input.onchange = () => {
        const key = input.dataset.custom as keyof Pick<
          Preset,
          "targetWidth" | "targetHeight" | "minimumWidth" | "minimumHeight" | "aspectTolerance"
        >;
        this.preset = { ...this.preset, [key]: Number(input.value) };
        this.recheckPreset();
        this.render();
      };
    });
    this.root.querySelector<HTMLSelectElement>("#filter")!.value = this.filter;
    this.root.querySelector<HTMLSelectElement>("#filter")!.onchange = (e) => {
      this.filter = (e.target as HTMLSelectElement).value;
      this.render();
    };
    this.root.querySelector<HTMLSelectElement>("#target")!.onchange = (e) => {
      this.target = Number((e.target as HTMLSelectElement).value);
      this.render();
    };
    this.root
      .querySelectorAll<HTMLElement>("[data-action]")
      .forEach((element) => (element.onclick = () => void this.action(element)));
    this.root.ondragover = (e) => e.preventDefault();
    this.root.ondrop = (e) => {
      e.preventDefault();
      void this.importDropped(e.dataTransfer);
    };
    this.root.onpaste = (e) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        void this.importFiles(toFileList(files), "clipboard");
      }
    };
    this.root.querySelectorAll<HTMLElement>("[data-drag]").forEach((item) => {
      item.ondragstart = (e) => e.dataTransfer?.setData("text/plain", item.dataset.drag!);
      item.ondragover = (e) => e.preventDefault();
      item.ondrop = (e) => {
        e.preventDefault();
        this.move(item.dataset.drag!, e.dataTransfer?.getData("text/plain") ?? "");
      };
    });
  }
  private async action(element: HTMLElement): Promise<void> {
    const action = element.dataset.action!,
      id = element.dataset.id;
    if (action === "files") this.root.querySelector<HTMLInputElement>("#files")!.click();
    else if (action === "folder") this.root.querySelector<HTMLInputElement>("#folder")!.click();
    else if (action === "project-import")
      this.root.querySelector<HTMLInputElement>("#project-file")!.click();
    else if (action === "samples") await this.loadSamples();
    else if (action === "language") {
      this.language = this.language === "en" ? "zh" : "en";
      this.render();
    } else if (action === "theme") {
      document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === "light" ? "dark" : "light";
    } else if (action === "reset") this.reset();
    else if (action === "cancel") {
      this.cancelled = true;
      this.queue = [];
      this.render();
    } else if (action === "suggest") {
      const suggestions = suggestShortlist(this.images, this.target);
      this.images = this.images.map((image) => ({
        ...image,
        selectionStatus: suggestions.some((x) => x.id === image.id)
          ? "keep"
          : image.selectionStatus,
        shortlistOrder: suggestions.findIndex((x) => x.id === image.id) + 1 || image.shortlistOrder
      }));
      this.render();
    } else if (action === "status" && id)
      this.setStatus(id, element.dataset.status as Screenshot["selectionStatus"]);
    else if (action === "only" && id) {
      const target = this.images.find((i) => i.id === id)!;
      this.images = this.images.map((i) =>
        i.duplicateGroupId === target.duplicateGroupId
          ? { ...i, selectionStatus: i.id === id ? "keep" : "reject" }
          : i
      );
      this.reorder();
      this.render();
    } else if (action === "remove" && id) this.setStatus(id, "unreviewed");
    else if (action === "detail" && id) this.showDetail(id);
    else if (action === "export") await this.downloadZip();
    else if (action === "contact")
      this.download(await createContactSheet(this.shortlist), "contact-sheet.png");
    else if (action === "csv")
      this.download(
        new Blob([buildCsv(this.images)], { type: "text/csv" }),
        "promosift-report.csv"
      );
    else if (action === "project")
      this.download(
        new Blob([buildProject(this.images, this.preset)], { type: "application/json" }),
        "promosift-project.json"
      );
  }
  private async importFiles(files: FileList | null, source: ImportSource): Promise<void> {
    if (!files) return;
    this.errors = [];
    const remaining = LIMITS.count - this.images.length;
    if (files.length > remaining)
      this.errors.push(
        `Only ${LIMITS.count} images can be imported at once; extra files were skipped.`
      );
    for (const file of [...files].slice(0, remaining))
      try {
        const image = await validateAndCreate(file, source);
        if (this.images.some((i) => i.contentHash === image.contentHash)) {
          URL.revokeObjectURL(image.objectUrl);
          this.errors.push(`${file.name}: already imported.`);
        } else this.images.push(image);
      } catch (error) {
        this.errors.push(error instanceof Error ? error.message : "Could not import image.");
      }
    if (this.images.reduce((sum, i) => sum + i.sizeBytes, 0) > LIMITS.warningBytes)
      this.errors.push(
        "Imported files exceed the 2 GB advisory threshold; your browser may need more memory."
      );
    this.queue = this.images.filter((i) => i.analysisStatus === "queued").map((i) => i.id);
    this.cancelled = false;
    this.render();
    this.analyzeNext();
  }
  private async importFolder(files: FileList | null): Promise<void> {
    await this.importFiles(files, "folder");
    this.restoreProjectSelections();
  }
  private async importDropped(transfer: DataTransfer | null): Promise<void> {
    if (!transfer) return;
    const files = await filesFromDrop(transfer);
    await this.importFiles(toFileList(files), "drop");
  }
  private async loadProject(file: File | undefined): Promise<void> {
    if (!file) return;
    try {
      const candidate = JSON.parse(await file.text()) as PromoSiftProject;
      if (candidate.version !== 1 || !Array.isArray(candidate.images))
        throw new Error("This is not a PromoSift project file.");
      this.pendingProject = { preset: candidate.preset, images: candidate.images };
      if (candidate.preset) this.preset = candidate.preset;
      this.errors = [
        "Project loaded. Choose the original image folder so PromoSift can match files by hash."
      ];
      this.render();
    } catch (error) {
      this.errors = [error instanceof Error ? error.message : "Could not read project file."];
      this.render();
    }
  }
  private restoreProjectSelections(): void {
    if (!this.pendingProject) return;
    const saved = new Map(this.pendingProject.images.map((image) => [image.contentHash, image]));
    let matched = 0;
    this.images = this.images.map((image) => {
      const previous = saved.get(image.contentHash);
      if (!previous) return image;
      matched += 1;
      return {
        ...image,
        selectionStatus: previous.selectionStatus ?? "unreviewed",
        shortlistOrder: previous.shortlistOrder
      };
    });
    this.errors.push(
      `Restored ${matched} of ${this.pendingProject.images.length} project records by content hash.`
    );
    this.pendingProject = undefined;
    this.reorder();
  }
  private recheckPreset(): void {
    this.images = this.images.map((image) => ({
      ...image,
      specStatus: image.width ? evaluatePreset(image.width, image.height, this.preset) : undefined
    }));
  }
  private analyzeNext(): void {
    if (this.cancelled || !this.queue.length) return;
    const id = this.queue.shift()!,
      image = this.images.find((i) => i.id === id)!;
    image.analysisStatus = "analyzing";
    this.worker.postMessage({ id, file: image.file });
    this.render();
  }
  private receiveAnalysis(message: {
    ok: boolean;
    result?: WorkerOutput;
    id?: string;
    message?: string;
  }): void {
    if (message.ok && message.result)
      this.images = applyAnalysis(this.images, message.result, this.preset);
    else if (message.id) {
      const image = this.images.find((i) => i.id === message.id);
      if (image) image.analysisStatus = "error";
      this.errors.push(message.message ?? "Unable to analyze image.");
    }
    this.render();
    this.analyzeNext();
  }
  private setStatus(id: string, status: Screenshot["selectionStatus"]): void {
    this.images = this.images.map((image) =>
      image.id === id
        ? {
            ...image,
            selectionStatus: status,
            shortlistOrder: status === "keep" ? this.shortlist.length + 1 : undefined
          }
        : image
    );
    this.reorder();
    this.render();
  }
  private reorder(): void {
    this.images = this.images.map((image) => ({
      ...image,
      shortlistOrder:
        image.selectionStatus === "keep"
          ? this.shortlist.findIndex((x) => x.id === image.id) + 1
          : undefined
    }));
  }
  private move(targetId: string, sourceId: string): void {
    const list = this.shortlist;
    const from = list.findIndex((i) => i.id === sourceId),
      to = list.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    this.images = this.images.map((image) => ({
      ...image,
      shortlistOrder: list.findIndex((i) => i.id === image.id) + 1 || undefined
    }));
    this.render();
  }
  private showDetail(id: string): void {
    const image = this.images.find((i) => i.id === id)!;
    window.alert(
      `${image.fileName}\n${image.width}×${image.height}\nBlur score: ${image.blurScore.toFixed(2)}\nBrightness: ${image.brightnessMean.toFixed(2)}\nContrast: ${image.contrastScore.toFixed(2)}\nFlags: ${image.qualityFlags.join(", ") || "None"}\n${this.text().heuristic}`
    );
  }
  private reset(): void {
    this.images.forEach((i) => URL.revokeObjectURL(i.objectUrl));
    this.images = [];
    this.queue = [];
    this.errors = [];
    this.render();
  }
  private async loadSamples(): Promise<void> {
    const files = await Promise.all(
      sampleFiles.map(async (name) => {
        const response = await fetch(`${import.meta.env.BASE_URL}samples/${name}`);
        return new File([await response.blob()], name, { type: "image/png" });
      })
    );
    await this.importFiles(toFileList(files), "sample");
  }
  private async downloadZip(): Promise<void> {
    try {
      this.download(await createSelectionZip(this.images, true, 3), "promosift-selection.zip");
    } catch (error) {
      this.errors.push(error instanceof Error ? error.message : "Could not export ZIP.");
      this.render();
    }
  }
  private download(blob: Blob, name: string): void {
    const href = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = href;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
}
function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`;
}
function toFileList(files: File[]): FileList {
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  return transfer.files;
}

async function filesFromDrop(transfer: DataTransfer): Promise<File[]> {
  const entries = [...transfer.items]
    .map((item) =>
      (
        item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }
      ).webkitGetAsEntry?.()
    )
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  if (!entries.length) return [...transfer.files];
  return (await Promise.all(entries.map(readEntry))).flat();
}
function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile)
    return new Promise((resolve) =>
      (entry as FileSystemFileEntry).file(
        (file) => resolve([file]),
        () => resolve([])
      )
    );
  const directory = entry as FileSystemDirectoryEntry;
  return new Promise((resolve) => {
    const reader = directory.createReader(),
      files: File[] = [];
    const read = () =>
      reader.readEntries(
        async (entries) => {
          if (!entries.length) return resolve(files);
          files.push(...(await Promise.all(entries.map(readEntry))).flat());
          read();
        },
        () => resolve(files)
      );
    read();
  });
}
