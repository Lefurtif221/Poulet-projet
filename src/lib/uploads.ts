import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function saveImage(file: File | null | undefined): Promise<string | null> {
  if (!file || !(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error("Photo trop lourde (3 Mo maximum).");
  if (!ALLOWED.includes(file.type)) throw new Error("Format photo non accepté (JPEG, PNG ou WebP).");

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);
  return `/uploads/${filename}`;
}
