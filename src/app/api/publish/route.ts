// src/app/api/publish/route.ts
import { NextResponse } from "next/server";
import { exists, saveJSON, removeJSON, ROUTINE_KEY, TIF_KEY } from "@/lib/cloudStorage";

export const dynamic = "force-dynamic";

// health/check (do files exist?)
export async function GET() {
  const [routine, tif] = await Promise.all([exists(ROUTINE_KEY), exists(TIF_KEY)]);
  return NextResponse.json({ routine, tif });
}

// publish both (or either) — called by Admin “Publish”
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { routine, routineMeta, tif, tifMeta } = body ?? {};

  // you can publish either one, but admin UI usually sends both
  if (routine) {
    await saveJSON(ROUTINE_KEY, { data: routine, meta: routineMeta ?? {} });
  }
  if (tif) {
    await saveJSON(TIF_KEY, { data: tif, meta: tifMeta ?? {} });
  }
  return NextResponse.json({ ok: true });
}

// clear both
export async function DELETE() {
  await Promise.all([removeJSON(ROUTINE_KEY), removeJSON(TIF_KEY)]);
  return NextResponse.json({ ok: true });
}
