import type { Screenshot } from "../core/types";

export async function createContactSheet(images: Screenshot[], columns = 3): Promise<Blob> {
  const width = 1500,
    cardWidth = Math.floor(width / columns),
    cardHeight = 250,
    header = 110;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = header + Math.ceil(images.length / columns) * cardHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#10121b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 30px system-ui";
  ctx.fillText("PromoSift contact sheet", 36, 46);
  ctx.font = "16px system-ui";
  ctx.fillText(`Generated ${new Date().toLocaleString()}`, 36, 78);
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index],
      x = (index % columns) * cardWidth + 16,
      y = header + Math.floor(index / columns) * cardHeight + 16;
    const bitmap = await createImageBitmap(image.file);
    const scale = Math.min((cardWidth - 32) / bitmap.width, 165 / bitmap.height);
    ctx.drawImage(bitmap, x, y, bitmap.width * scale, bitmap.height * scale);
    bitmap.close();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px system-ui";
    ctx.fillText(`${index + 1}. ${image.fileName}`.slice(0, 48), x, y + 188);
    ctx.font = "13px system-ui";
    ctx.fillStyle = "#b6bed0";
    ctx.fillText(
      `${image.width}×${image.height} · ${image.qualityFlags.join(", ") || "No flags"}`.slice(
        0,
        70
      ),
      x,
      y + 212
    );
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create contact sheet"))),
      "image/png"
    )
  );
}
