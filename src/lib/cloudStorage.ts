// src/lib/cloudStorage.ts
import { put, head, del } from "@vercel/blob";

export const ROUTINE_KEY = "published/routine.json";
export const TIF_KEY = "published/tif.json";

type JsonAny = Record<string, any>;

export async function saveJSON(key: string, data: JsonAny) {
  const body = JSON.stringify(data);
  // public read so student/teacher can fetch via API
  const res = await put(key, body, {
    access: "public",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false, // keep stable key
  });
  return { url: res.url }; // stable URL
}

export async function getJSON<T = any>(key: string): Promise<T | null> {
  const info = await head(key).catch(() => null);
  if (!info?.downloadUrl) return null;
  const r = await fetch(info.downloadUrl, { cache: "no-store" });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

export async function exists(key: string): Promise<boolean> {
  const info = await head(key).catch(() => null);
  return !!info?.downloadUrl;
}

export async function removeJSON(key: string) {
  // safe: ignore errors if already missing
  try { await del(key); } catch {}
}
