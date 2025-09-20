import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const dir = path.join(process.cwd(), "public", "published");

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { routine, tif, meta } = body || {};
  await fs.mkdir(dir, { recursive: true });

  const writes: Promise<any>[] = [];
  const stamp = new Date().toISOString();

  if (Array.isArray(routine)) {
    const payload = { data: routine, meta: { ...meta, at: stamp }, at: stamp };
    writes.push(fs.writeFile(path.join(dir, "routine.json"), JSON.stringify(payload, null, 2), "utf8"));
  }
  if (Array.isArray(tif)) {
    const payload = { data: tif, meta: { ...meta, at: stamp }, at: stamp };
    writes.push(fs.writeFile(path.join(dir, "tif.json"), JSON.stringify(payload, null, 2), "utf8"));
  }

  await Promise.all(writes);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  try { await fs.unlink(path.join(dir, "routine.json")); } catch {}
  try { await fs.unlink(path.join(dir, "tif.json")); } catch {}
  return NextResponse.json({ ok: true });
}
