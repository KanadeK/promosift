export function dHash(luminance: Uint8ClampedArray, width: number, height: number): string {
  let bits = "";
  for (let y = 0; y < 8; y += 1)
    for (let x = 0; x < 8; x += 1) {
      const a = luminance[Math.min(height - 1, y) * width + Math.min(width - 1, x)];
      const b = luminance[Math.min(height - 1, y) * width + Math.min(width - 1, x + 1)];
      bits += a > b ? "1" : "0";
    }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

export function hammingDistance(a: string, b: string): number {
  let value = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (value) {
    count += Number(value & 1n);
    value >>= 1n;
  }
  return count;
}
