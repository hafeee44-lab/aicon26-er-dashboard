import type { Attachment } from "@/lib/types";

const MAX_SIDE = 1600;

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function readUpload(file: File): Promise<{ attachment: Attachment; preview: string | null }> {
  if (file.type === "application/pdf") {
    return { attachment: { mimeType: file.type, data: await toBase64(file) }, preview: null };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { attachment: { mimeType: "image/jpeg", data: url.split(",")[1] }, preview: url };
}
