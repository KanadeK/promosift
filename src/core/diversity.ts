import type { Screenshot } from "./types";

export function histogramDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - (b[index] ?? 0)) ** 2, 0));
}

export function suggestShortlist(images: Screenshot[], target = 8): Screenshot[] {
  const candidates = images
    .filter((image) => image.selectionStatus !== "reject")
    .sort((a, b) => score(b) - score(a));
  const selected: Screenshot[] = [];
  while (candidates.length && selected.length < target) {
    const next = selected.length
      ? candidates.reduce((best, candidate) =>
          minDistance(candidate, selected) > minDistance(best, selected) ? candidate : best
        )
      : candidates[0];
    selected.push(next);
    candidates.splice(candidates.indexOf(next), 1);
  }
  return selected;
}

export function averageDiversity(images: Screenshot[]): number {
  if (images.length < 2) return 0;
  let total = 0,
    pairs = 0;
  for (let i = 0; i < images.length; i += 1)
    for (let j = 0; j < i; j += 1) {
      total += histogramDistance(images[i].histogram, images[j].histogram);
      pairs += 1;
    }
  return total / pairs;
}
function minDistance(image: Screenshot, selected: Screenshot[]): number {
  return Math.min(...selected.map((other) => histogramDistance(image.histogram, other.histogram)));
}
function score(image: Screenshot): number {
  return (
    (image.specStatus === "FAIL" ? -100 : image.specStatus === "WARNING" ? -20 : 0) +
    Math.min(image.blurScore / 100, 30) -
    image.qualityFlags.length * 5
  );
}
