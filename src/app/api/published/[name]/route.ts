// src/app/api/published/[name]/route.ts
import { NextResponse } from "next/server";
import { getJSON, ROUTINE_KEY, TIF_KEY } from "@/lib/cloudStorage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { name: "routine" | "tif" } }
) {
  const key = params.name === "tif" ? TIF_KEY : ROUTINE_KEY;
  const json = await getJSON(key);
  if (!json) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(json);
}
