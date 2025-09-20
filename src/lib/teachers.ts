// lib/teachers.ts
import { canon } from "./routine";

export type TeacherInfo = {
  name: string;
  initial: string;
  designation: string;
  mobile: string;
  email: string;
  officeDesk: string;
  dayOff: string;
};

const headerAliases: Record<string, keyof TeacherInfo> = {
  name: "name",
  initial: "initial",
  designation: "designation",
  mobile: "mobile",
  phone: "mobile",
  email: "email",
  "office desk": "officeDesk",
  officedesk: "officeDesk",
  "day off": "dayOff",
  dayoff: "dayOff",
};

function mapHeadersToKeys(headers: string[]): (keyof TeacherInfo | null)[] {
  return headers.map((h) => {
    const k = canon(h).toLowerCase();
    return headerAliases[k] ?? null;
  });
}

/** Parse TIF (xlsx/xls/csv): Name | Initial | Designation | Mobile | Email | Office Desk | Day Off */
export async function parseTeacherInfo(file: File): Promise<TeacherInfo[]> {
  const lower = (file.name || "").toLowerCase();

  // CSV
  if (lower.endsWith(".csv")) {
    const Papa = (await import("papaparse")) as typeof import("papaparse");
    const text = await file.text();
    const res = Papa.parse<string[]>(text, { skipEmptyLines: true });
    const rows = (res.data as unknown as string[][]) || [];
    if (!rows.length) return [];

    const headerMap = mapHeadersToKeys(rows[0] || []);
    const out: TeacherInfo[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const t: Partial<TeacherInfo> = {};
      headerMap.forEach((k, idx) => {
        if (!k) return;
        (t[k] as any) = canon(row[idx]);
      });
      if (Object.values(t).some(Boolean)) {
        out.push({
          name: t.name || "",
          initial: t.initial || "",
          designation: t.designation || "",
          mobile: t.mobile || "",
          email: t.email || "",
          officeDesk: t.officeDesk || "",
          dayOff: t.dayOff || "",
        });
      }
    }
    return out;
  }

  // XLSX / XLS
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];

  const aoa: any[][] =
    XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" }) ||
    [];
  if (!aoa.length) return [];

  const headerMap = mapHeadersToKeys((aoa[0] || []).map(canon));
  const out: TeacherInfo[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = (aoa[i] || []).map(canon);
    const t: Partial<TeacherInfo> = {};
    headerMap.forEach((k, idx) => {
      if (!k) return;
      (t[k] as any) = row[idx];
    });
    if (Object.values(t).some(Boolean)) {
      out.push({
        name: t.name || "",
        initial: t.initial || "",
        designation: t.designation || "",
        mobile: t.mobile || "",
        email: t.email || "",
        officeDesk: t.officeDesk || "",
        dayOff: t.dayOff || "",
      });
    }
  }
  return out;
}

/** Find teacher by exact initial (case-insensitive) inside TIF list. */
export function findByInitial(list: TeacherInfo[], initial: string): TeacherInfo | null {
  const key = canon(initial).toUpperCase();
  if (!key) return null;
  return list.find((t) => canon(t.initial).toUpperCase() === key) || null;
}
