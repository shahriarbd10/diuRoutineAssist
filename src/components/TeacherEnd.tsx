// src/components/TeacherEnd.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, FileDown, IdCard } from "lucide-react";
import { ClassRow, DAY_NAMES, SLOTS, isRoutineEntry, uc } from "@/lib/routine";
import { InitialPicker, SlotPicker } from "./Filters";
import { parseTeacherInfo, TeacherInfo, findByInitial } from "@/lib/teachers";
import { exportCSV, exportTeacherPDFStructured } from "@/lib/exporters";
import { motion } from "framer-motion";

const TIF_LS_KEY = "ra_tif_published_v1";

export default function TeacherEnd({
  rows,
  allowTifImport = true, // portals pass false; admin uses true
}: {
  rows: ClassRow[];
  allowTifImport?: boolean;
}) {
  // TIF
  const [tifFileName, setTifFileName] = useState("");
  const [tif, setTif] = useState<TeacherInfo[]>([]);
  const [tifSource, setTifSource] = useState<"uploaded" | "published" | "none">("none");

  // filters
  const [selectedInitial, setSelectedInitial] = useState<string>("");
  const [slot, setSlot] = useState<string>("");

  // 1) Auto-load published TIF from localStorage (set by portals or admin)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIF_LS_KEY);
      if (!raw) {
        setTif([]);
        setTifSource("none");
        return;
      }
      const parsed = JSON.parse(raw);
      const list: TeacherInfo[] = Array.isArray(parsed?.data) ? parsed.data : [];
      setTif(list);
      const name = parsed?.meta?.fileName || "Published TIF";
      setTifFileName(name);
      setTifSource("published");
    } catch {
      setTif([]);
      setTifSource("none");
    }
  }, []);

  const daysList = useMemo(() => {
    const order: string[] = [];
    for (const r of rows) if (r.day && !order.includes(r.day)) order.push(r.day);
    return order.length ? order : DAY_NAMES;
  }, [rows]);

  // initials present in routine; attach TIF names if present
  const routineInitials = useMemo(
    () => Array.from(new Set(rows.map((r) => uc(r.teacher)).filter(Boolean))).sort(),
    [rows]
  );

  const teacherOptions = useMemo(() => {
    const nameByInitial = new Map<string, string>();
    for (const t of tif) nameByInitial.set(uc(t.initial), t.name || "");
    return routineInitials.map((initial) => ({
      initial,
      name: nameByInitial.get(initial) || "",
    }));
  }, [routineInitials, tif]);

  const exactInitial = useMemo(() => uc(selectedInitial || ""), [selectedInitial]);

  const filteredByDay = useMemo(() => {
    const by: Record<string, ClassRow[][]> = {};
    for (const day of daysList) {
      by[day] = SLOTS.map((s) =>
        rows
          .filter((r) => r.day === day && r.slot === s)
          .filter((r) => (!exactInitial ? true : uc(r.teacher) === exactInitial))
          .filter((r) => (!slot ? true : r.slot === slot))
          .filter(isRoutineEntry)
      );
    }
    return by;
  }, [rows, daysList, slot, exactInitial]);

  const flatExport = useMemo(
    () =>
      rows
        .filter((r) => (!exactInitial ? true : uc(r.teacher) === exactInitial))
        .filter((r) => (!slot ? true : r.slot === slot))
        .filter(isRoutineEntry),
    [rows, exactInitial, slot]
  );

  const matchedTeacher = useMemo(
    () => (exactInitial ? findByInitial(tif, exactInitial) : null),
    [tif, exactInitial]
  );

  // 2) Optional upload (admin only when allowTifImport=true)
  const onTifFile = async (file?: File) => {
    if (!file) return;
    try {
      setTifFileName(file.name);
      const list = await parseTeacherInfo(file);
      const safe = Array.isArray(list)
        ? list
        : Array.isArray((list as any)?.rows)
        ? (list as any).rows
        : [];
      setTif(safe);
      setTifSource("uploaded");
      // Also stash to LS so preview stays consistent while navigating tabs
      localStorage.setItem(
        TIF_LS_KEY,
        JSON.stringify({ data: safe, meta: { fileName: file.name, preview: true } })
      );
    } catch (e) {
      console.error(e);
      setTif([]);
      setTifSource("none");
    }
  };

  return (
    <div className="space-y-5">
      {/* Import + filters */}
      <div className="rounded-2xl border p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {allowTifImport ? (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-neutral-700">
                Import Teacher Info (TIF) — XLSX/CSV
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => onTifFile(e.target.files?.[0])}
                className="mt-1 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-700"
              />
              <span className="mt-2 text-xs text-neutral-500">
                <IdCard size={12} className="inline-block mr-1" />
                {tifFileName
                  ? `${tifSource === "uploaded" ? "Loaded" : "Published"}: ${tifFileName} (${tif.length} records)`
                  : "No TIF loaded"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-neutral-700">Teacher Info (TIF)</label>
              <span className="mt-2 text-xs text-neutral-600">
                <IdCard size={12} className="inline-block mr-1" />
                {tif.length
                  ? `Using ${tifSource === "published" ? "published" : "loaded"} TIF: ${tifFileName} (${tif.length} records)`
                  : "No TIF available (ask admin to publish)."}
              </span>
            </div>
          )}

          {/* Search-or-type initial */}
          <InitialPicker
            value={selectedInitial}
            onChange={setSelectedInitial}
            options={teacherOptions}
            label="Teacher (Initial) — search or type"
            placeholder="e.g., AM (or type a name)"
          />
          <SlotPicker value={slot} onChange={setSlot} />
        </div>

        {/* Info card / unavailable notice */}
        {selectedInitial ? (
          matchedTeacher ? (
            <TeacherInfoCard teacher={matchedTeacher} />
          ) : (
            <UnavailableCard initial={exactInitial} />
          )
        ) : null}
      </div>

      {/* Routine table */}
      {selectedInitial ? (
        <TeacherRoutine daysList={daysList} matrixByDay={filteredByDay} />
      ) : (
        <div className="rounded-md border bg-white px-3 py-2 text-sm text-neutral-700">
          Type or pick a teacher initial to see their routine.
        </div>
      )}

      {/* Exports */}
      {selectedInitial && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() =>
              exportCSV(
                flatExport.map((r) => ({
                  Day: r.day,
                  Slot: r.slot,
                  Course: r.course,
                  Batch_Section: r.batch,
                  Teacher: r.teacher,
                  Room: r.room,
                })),
                `teacher_${exactInitial || "all"}_${slot || "any"}.csv`
              )
            }
            disabled={!flatExport.length}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Download size={16} /> Export Filtered (CSV)
          </button>

          {/* Structured (text) PDF for teacher */}
          <button
            onClick={() =>
              exportTeacherPDFStructured(
                rows, // exporter filters internally
                {
                  daysList,
                  initial: exactInitial || selectedInitial,
                  slot,
                  title: "Class Routine — Teacher",
                  institute: "Department of CSE",
                  printedOn: new Date(),
                },
                `teacher_${exactInitial || "all"}_${slot || "any"}.pdf`
              )
            }
            disabled={!flatExport.length}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border hover:bg-neutral-50"
          >
            <FileDown size={16} /> Export PDF
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- presentation helpers ---------------- */

function TeacherRoutine({
  daysList,
  matrixByDay,
}: {
  daysList: string[];
  matrixByDay: Record<string, ClassRow[][]>;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px] rounded-xl border" id="schedule-multiday">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Day</th>
              {SLOTS.map((s) => (
                <th key={s} className="px-3 py-2 text-left font-semibold">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daysList.map((day) => {
              const rowCells = matrixByDay[day] || [];
              const total = rowCells.reduce((acc, arr) => acc + arr.length, 0);
              if (!total) return null;
              return (
                <tr key={day} className="align-top">
                  <td className="whitespace-nowrap px-3 py-3 font-medium">{day}</td>
                  {SLOTS.map((slot, idx) => (
                    <td key={`${day}-${slot}`} className="px-3 py-3">
                      <Cell items={rowCells[idx] || []} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ items }: { items: ClassRow[] }) {
  return (
    <div className="space-y-2">
      {items.length ? (
        items.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border p-2 hover:border-indigo-300"
          >
            <div className="font-medium">{r.course || "(Course)"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
              {r.batch && <span className="inline-flex rounded-full border px-2 py-0.5">{r.batch}</span>}
              {r.room && <span>📍 {r.room}</span>}
            </div>
          </motion.div>
        ))
      ) : (
        <div className="text-xs text-neutral-400">—</div>
      )}
    </div>
  );
}

function TeacherInfoCard({ teacher }: { teacher: TeacherInfo }) {
  return (
    <div className="mt-4 rounded-lg border p-3 bg-white">
      <div className="text-sm text-neutral-700">
        <div className="font-semibold text-base">
          {teacher.name} <span className="text-neutral-500">({teacher.initial})</span>
        </div>
        <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2">
          <InfoRow label="Designation" value={teacher.designation} />
          <InfoRow label="Mobile" value={teacher.mobile} />
          <InfoRow label="Email" value={teacher.email} />
          <InfoRow label="Office Desk" value={teacher.officeDesk} />
          <InfoRow label="Day Off" value={teacher.dayOff} />
        </div>
      </div>
    </div>
  );
}

function UnavailableCard({ initial }: { initial: string }) {
  return (
    <div className="mt-4 rounded-lg border p-3 bg-white">
      <div className="text-sm text-neutral-700">
        <div className="font-semibold text-base">
          Information unavailable for <span className="text-indigo-700">{initial}</span>
        </div>
        <div className="mt-1 text-neutral-600">
          No matching record in Teacher Info. Ask admin to publish the latest TIF. The routine below still shows all classes for <b>{initial}</b>.
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
