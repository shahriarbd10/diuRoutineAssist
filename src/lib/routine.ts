// lib/routine.ts
export type AnyRow = Record<string, any>;

export type ClassRow = {
  day: string;
  slot: string;
  course: string;
  batch: string;
  teacher: string;
  room: string;
  raw?: AnyRow;
};

/* ---------- Canonical slots & days ---------- */
export const SLOTS = [
  "08:30-10:00",
  "10:00-11:30",
  "11:30-01:00",
  "01:00-02:30",
  "02:30-04:00",
  "04:00-05:30",
];

export const DAY_NAMES = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// Special value the UI uses to explicitly mean "show all days"
export const ALL_DAYS = "__ALL__";

export const DAY_SET = new Set(DAY_NAMES.map((d) => d.toLowerCase()));
export const slotSet = new Set(SLOTS.map((s) => s.replace(/\s+/g, "")));

/* ---------- String utils ---------- */
export const canon = (s: any) =>
  (s ?? "").toString().replace(/\s+/g, " ").trim();

export const slug = canon; // compatibility alias
export const uc = (s: string) => canon(s).toUpperCase();
export const toTitle = (s: string) =>
  s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;

/* ---------- Course → Batch extractor ---------- */
export const extractBatch = (course: string) => {
  const m = (course || "").match(/\(([^)]+)\)(?!.*\([^)]*\))/);
  return m ? m[1].replace(/\s+/g, "") : "";
};

/* ---------- Known footer / notice texts to ignore ---------- */
export const NOISE_PATTERNS: RegExp[] = [
  /in case of any routine[-\s]*related queries/i,
  /please contact (the )?routine committee/i,
  /dr\.\s*sheak\s*rashed\s*haider\s*noori/i,
  /professor\s*and\s*head/i,
  /department\s*of\s*cse/i,
];

export const isNoiseText = (text: string) =>
  NOISE_PATTERNS.some((rx) => rx.test(text || ""));

/* ---------- Valid routine entry + occupancy rules ---------- */
export const isRoutineEntry = (r: ClassRow) => {
  const joined = `${canon(r.room)} ${canon(r.course)} ${canon(r.teacher)}`;
  if (isNoiseText(joined)) return false;
  return true;
};

/** A slot is considered OCCUPIED iff it has BOTH a course and a teacher. */
export const countsAsOccupied = (r: ClassRow) => {
  if (!isRoutineEntry(r)) return false;
  return !!canon(r.course) && !!canon(r.teacher);
};

/** Heuristic for room-looking strings (e.g., "KT-208", "KT-513 (COM LAB)") */
export const isRoomCandidate = (room: string) => {
  const s = canon(room);
  if (!s) return false;
  if (isNoiseText(s)) return false;
  if (s.length > 60) return false;
  const codeLike = /^[A-Za-z0-9\-()\/ ]+$/i.test(s);
  const hasDigit = /\d/.test(s);
  const hasLab = /\bLAB\b/i.test(s);
  return codeLike && (hasDigit || hasLab);
};
