// lib/exporters.ts
import { jsPDF } from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { ClassRow, SLOTS, uc, ALL_DAYS } from "./routine";

/* ======================================================================
   CSV (unchanged)
====================================================================== */
export const exportCSV = (rows: any[], name: string) => {
  import("xlsx").then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Routine");
    XLSX.writeFile(wb, name);
  });
};

/* ======================================================================
   PDF helpers — tuned spacing and alignment
====================================================================== */
const MARGIN = 40;
const TITLE_SIZE = 20;
const SUB_SIZE = 11;
const DAY_SIZE = 14;

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitleLines: string[]
): number {
  let y = MARGIN;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_SIZE);
  doc.text(title, MARGIN, y);
  y += TITLE_SIZE + 6; // generous gap under title

  // Subtitle block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(SUB_SIZE);
  subtitleLines.forEach((line) => {
    if (!line) return;
    doc.text(line, MARGIN, y);
    y += SUB_SIZE + 4; // consistent line height
  });

  // Divider line
  y += 6;
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, doc.internal.pageSize.getWidth() - MARGIN, y);
  y += 12;

  return y;
}

function addDayTable(
  doc: jsPDF,
  day: string,
  rows: ClassRow[],
  startY: number
) {
  if (!rows.length) return startY;

  // Day heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(DAY_SIZE);
  doc.text(day, MARGIN, startY);
  startY += DAY_SIZE + 6;

  // Sort by canonical slot order
  const idx = new Map(SLOTS.map((s, i) => [s, i]));
  const sorted = rows.slice().sort(
    (a, b) => (idx.get(a.slot) ?? 0) - (idx.get(b.slot) ?? 0)
  );

  // Convert to table rows
  const body: RowInput[] = sorted.map((r) => [
    r.slot || "—",
    r.course || "—",
    r.batch || "—",
    r.teacher || "—",
    r.room || "—",
  ]);

  autoTable(doc, {
    startY,
    head: [["Slot", "Course", "Batch", "Teacher", "Room"]],
    body,
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      halign: "left",
      valign: "middle",
    },
    headStyles: { fillColor: [63, 81, 181], textColor: 255, halign: "left" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: MARGIN, right: MARGIN },
    columnStyles: {
      0: { cellWidth: 90 },  // Slot
      1: { cellWidth: 180 }, // Course
      2: { cellWidth: 70 },  // Batch
      3: { cellWidth: 80 },  // Teacher
      4: { cellWidth: "auto" }, // Room
    },
    // Ensure clean page breaks with a top margin when it flows to new pages
    pageBreak: "auto",
  });

  // Next Y position below the table
  const finalY = (doc as any).lastAutoTable.finalY || startY;
  return finalY + 14;
}

/* ======================================================================
   STUDENT PDF (structured text)
   Rules:
   1) If batch is provided → print ALL DAYS for that batch (optionally narrowed by slot)
   2) Else if fDay is ALL_DAYS/blank → print ALL DAYS (optionally by slot)
   3) Else → print only that single day
====================================================================== */
type StudentPDFOpts = {
  title?: string;
  institute?: string;
  printedBy?: string;
  printedOn?: Date;
  daysList: string[];
  fDay: string;    // "", specific day, or ALL_DAYS
  fBatch: string;  // if set → rule (1)
  fSlot: string;   // optional
};

export function exportStudentPDFStructured(
  data: ClassRow[],
  opts: StudentPDFOpts,
  fileName: string
) {
  const {
    title = "Class Routine",
    institute,
    printedBy,
    printedOn = new Date(),
    daysList,
    fDay,
    fBatch,
    fSlot,
  } = opts;

  const doc = new jsPDF("p", "pt", "a4");

  const subtitle: string[] = [];
  if (institute) subtitle.push(institute);
  subtitle.push(
    fBatch
      ? `Batch: ${fBatch} — All Days${fSlot ? ` — Slot: ${fSlot}` : ""}`
      : fDay && fDay !== ALL_DAYS
      ? `Day: ${fDay}${fSlot ? ` — Slot: ${fSlot}` : ""}`
      : `All Days${fSlot ? ` — Slot: ${fSlot}` : ""}`
  );
  subtitle.push(
    `Printed on: ${printedOn.toLocaleString()}${
      printedBy ? ` — by ${printedBy}` : ""
    }`
  );

  let y = drawHeader(doc, title, subtitle);

  const targetDays =
    fBatch || !fDay || fDay === ALL_DAYS ? daysList : [fDay];

  let anyPrinted = false;

  for (let i = 0; i < targetDays.length; i++) {
    const day = targetDays[i];

    const rowsForDay = data.filter((r) => {
      if (r.day !== day) return false;
      if (fSlot && r.slot !== fSlot) return false;
      if (fBatch && !uc(r.batch).includes(uc(fBatch))) return false;
      return true;
    });

    if (!rowsForDay.length) continue;

    // Add page if we're too close to bottom
    if (y > doc.internal.pageSize.getHeight() - 140) {
      doc.addPage();
      y = drawHeader(doc, title, subtitle);
    }

    y = addDayTable(doc, day, rowsForDay, y);
    anyPrinted = true;
  }

  if (!anyPrinted) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text("No matching entries for the selected filters.", MARGIN, y);
  }

  doc.save(fileName);
}

/* ======================================================================
   TEACHER PDF (structured text) — optional but included for parity
====================================================================== */
type TeacherPDFOpts = {
  title?: string;
  institute?: string;
  printedOn?: Date;
  daysList: string[];
  initial: string;  // exact teacher initial
  slot?: string;    // optional
};

export function exportTeacherPDFStructured(
  data: ClassRow[],
  opts: TeacherPDFOpts,
  fileName: string
) {
  const {
    title = "Class Routine — Teacher",
    institute,
    printedOn = new Date(),
    daysList,
    initial,
    slot,
  } = opts;

  const doc = new jsPDF("p", "pt", "a4");

  const subtitle: string[] = [];
  if (institute) subtitle.push(institute);
  subtitle.push(`Teacher: ${initial}${slot ? ` — Slot: ${slot}` : ""}`);
  subtitle.push(`Printed on: ${printedOn.toLocaleString()}`);

  let y = drawHeader(doc, title, subtitle);

  let anyPrinted = false;

  for (let i = 0; i < daysList.length; i++) {
    const day = daysList[i];

    const rowsForDay = data.filter((r) => {
      if (r.day !== day) return false;
      if (uc(r.teacher) !== uc(initial)) return false;
      if (slot && r.slot !== slot) return false;
      return true;
    });

    if (!rowsForDay.length) continue;

    if (y > doc.internal.pageSize.getHeight() - 140) {
      doc.addPage();
      y = drawHeader(doc, title, subtitle);
    }

    y = addDayTable(doc, day, rowsForDay, y);
    anyPrinted = true;
  }

  if (!anyPrinted) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text("No matching entries for the selected filters.", MARGIN, y);
  }

  doc.save(fileName);
}
