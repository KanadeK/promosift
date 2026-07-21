import { hammingDistance } from "./perceptual-hash";
import { THRESHOLDS } from "./thresholds";
import type { Screenshot } from "./types";

class UnionFind {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(value: number): number {
    while (this.parent[value] !== value) {
      this.parent[value] = this.parent[this.parent[value]];
      value = this.parent[value];
    }
    return value;
  }
  union(a: number, b: number): void {
    a = this.find(a);
    b = this.find(b);
    if (a !== b) this.parent[b] = a;
  }
}

export function clusterDuplicates(images: Screenshot[]): Screenshot[] {
  const uf = new UnionFind(images.length);
  for (let i = 0; i < images.length; i += 1)
    for (let j = 0; j < i; j += 1) {
      const a = images[i],
        b = images[j];
      if (a.contentHash === b.contentHash) uf.union(i, j);
      else if (hammingDistance(a.dHash, b.dHash) <= THRESHOLDS.similarHamming) uf.union(i, j);
    }
  const groups = new Map<number, number[]>();
  images.forEach((_, i) => {
    const root = uf.find(i);
    groups.set(root, [...(groups.get(root) ?? []), i]);
  });
  return images.map((image, index) => {
    const members = groups.get(uf.find(index)) ?? [];
    if (members.length < 2)
      return { ...image, duplicateGroupId: undefined, duplicateKind: undefined };
    const closest = members.filter((i) => i !== index).map((i) => images[i]);
    const exact = closest.some((other) => other.contentHash === image.contentHash);
    const distance = Math.min(...closest.map((other) => hammingDistance(other.dHash, image.dHash)));
    return {
      ...image,
      duplicateGroupId: `group-${uf.find(index) + 1}`,
      duplicateKind: exact
        ? "EXACT_FILE_DUPLICATE"
        : distance <= THRESHOLDS.nearDuplicateHamming
          ? "VISUAL_NEAR_DUPLICATE"
          : "VISUALLY_SIMILAR"
    };
  });
}
