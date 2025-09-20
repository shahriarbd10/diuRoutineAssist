// lib/parse.ts
import {
  SLOTS,
  DAY_SET,
  slotSet,
  slug,
  toTitle,
  extractBatch,
  ClassRow,
} from "./routine";

export async function parseAOA(
  aoa: any[][]
): Promise<{ rows: ClassRow[]; msg: string }> {
  const nRows = aoa.length;
  const rowsOut: ClassRow[] = [];

  // find day banner rows: exactly one non-empty cell and is a day
  const dayRows: Array<{ idx: number; day: string }> = [];
  for (let r = 0; r < nRows; r++) {
    const row = (aoa[r] || []).map((v) => slug(v));
    const nonEmpty = row.filter((v) => v !== "");
    if (nonEmpty.length === 1 && DAY_SET.has(nonEmpty[0].toLowerCase())) {
      dayRows.push({ idx: r, day: toTitle(nonEmpty[0]) });
    }
  }
  if (!dayRows.length) throw new Error("No day banner rows detected.");

  const findSlotColumns = (r: number) => {
    const row = (aoa[r] || []).map((v) => slug(v));
    const hits: { col: number; label: string }[] = [];
    for (let c = 0; c < row.length; c++) {
      const label = row[c].replace(/\s+/g, "");
      if (slotSet.has(label)) hits.push({ col: c, label: row[c] });
    }
    return hits;
  };

  for (let d = 0; d < dayRows.length; d++) {
    const day = dayRows[d].day;
    const idxDay = dayRows[d].idx;
    const idxNextDay = d + 1 < dayRows.length ? dayRows[d + 1].idx : nRows;

    // slot header row
    const idxSlots = idxDay + 1;
    const slotHits = findSlotColumns(idxSlots);
    if (slotHits.length < 6) {
      let found = false;
      for (let r = idxDay + 1; r <= idxDay + 3; r++) {
        const test = findSlotColumns(r);
        if (test.length >= 6) {
          (slotHits as any).length = 0;
          test.forEach((h) => (slotHits as any).push(h));
          (slotHits as any)._row = r;
          found = true;
          break;
        }
      }
      if (!found) throw new Error(`Slot header row not found for ${day}`);
    }
    const slotRow = (slotHits as any)._row ?? idxSlots;

    // triplet header row (labels)
    const idxTripletHeader = slotRow + 1;

    // data rows
    for (let r = idxTripletHeader + 1; r < idxNextDay; r++) {
      const row = (aoa[r] || []).map((v) => slug(v));
      if (!row.some((v) => v !== "")) continue;

      for (let i = 0; i < 6; i++) {
        const base = slotHits[i]?.col ?? -1;
        if (base < 0) continue;
        const room = slug(row[base]);
        const course = slug(row[base + 1]);
        const teacher = slug(row[base + 2]);

        if (room || course || teacher) {
          rowsOut.push({
            day,
            slot: SLOTS[i],
            course,
            batch: extractBatch(course),
            teacher,
            room,
            raw: {},
          });
        }
      }
    }
  }

  return {
    rows: rowsOut,
    msg: `Parsed ${rowsOut.length} classes from ${dayRows.length} day blocks.`,
  };
}

export async function parseGridXLSX(file: File) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("No worksheet found.");
  const aoa: any[][] =
    XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" }) ||
    [];
  return parseAOA(aoa);
}

export async function parseGridCSV(file: File) {
  // Type the dynamic import to keep generics
  const Papa = (await import("papaparse")) as typeof import("papaparse");
  const text = await file.text();
  const res = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const aoa: string[][] = (res.data as unknown as string[][]) || [];
  const cleaned = aoa.map((row) => row.map((v) => (v ?? "").toString()));
  return parseAOA(cleaned);
}

export async function parseAny(file: File) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".csv")) return parseGridCSV(file);
  return parseGridXLSX(file);
}
