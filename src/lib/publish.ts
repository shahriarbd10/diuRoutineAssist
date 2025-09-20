"use client";

import type { ClassRow } from "@/lib/routine";
import type { TeacherInfo } from "@/lib/teachers";

const V = "v1";
const K_ROUTINE = `ra_routine_published_${V}`;
const K_TIF = `ra_tif_published_${V}`;

export type Published<T> = { data: T; at: string; meta?: Record<string, any> };

export function savePublishedRoutine(rows: ClassRow[], meta?: Record<string, any>) {
  const payload: Published<ClassRow[]> = { data: rows, at: new Date().toISOString(), meta };
  localStorage.setItem(K_ROUTINE, JSON.stringify(payload));
}
export function savePublishedTIF(list: TeacherInfo[], meta?: Record<string, any>) {
  const payload: Published<TeacherInfo[]> = { data: list, at: new Date().toISOString(), meta };
  localStorage.setItem(K_TIF, JSON.stringify(payload));
}

export function loadPublishedRoutine(): Published<ClassRow[]> | null {
  const raw = localStorage.getItem(K_ROUTINE);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export function loadPublishedTIF(): Published<TeacherInfo[]> | null {
  const raw = localStorage.getItem(K_TIF);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearPublishedRoutine() { localStorage.removeItem(K_ROUTINE); }
export function clearPublishedTIF() { localStorage.removeItem(K_TIF); }
