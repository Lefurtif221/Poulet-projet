import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function extensionFor(type: string): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}

export async function saveImage(file: File | null | undefined): Promise<string | null> {
  if (!file || !(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error("Photo trop lourde (3 Mo maximum).");
  if (!ALLOWED.includes(file.type)) throw new Error("Format photo non accepté (JPEG, PNG ou WebP).");

  const extension = extensionFor(file.type);
  const filename = `uploads/${randomUUID()}.${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, path.basename(filename)), buffer);
  return `/${filename}`;
}
