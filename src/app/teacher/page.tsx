// src/app/teacher/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import TeacherEnd from "@/components/TeacherEnd";
import { StudentSchedule } from "@/components/ScheduleTable";
import EmptyRoomTab from "@/components/EmptyRoomTab";
import { DayPicker, SlotPicker, TextInput } from "@/components/Filters";
import { Download, FileDown } from "lucide-react";
import {
  ClassRow, DAY_NAMES, SLOTS, uc, isRoutineEntry, ALL_DAYS,
} from "@/lib/routine";
import { loadPublishedRoutine, loadPublishedTIF } from "@/lib/publish";

type Tab = "teacher" | "student" | "rooms";

export default function TeacherPage() {
  const [tab, setTab] = useState<Tab>("teacher");
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [status, setStatus] = useState("");

  // student filters
  const [fDay, setFDay] = useState<string>("");
  const [fBatch, setFBatch] = useState<string>("");
  const [fSlot, setFSlot] = useState<string>("");

  // empty room filters
  const [erDay, setErDay] = useState<string>("");
  const [erSlot, setErSlot] = useState<string>("");

  useEffect(() => {
    const pub = loadPublishedRoutine();
    setRows(pub?.data || []);
    setStatus(pub ? `Loaded published routine (${pub?.meta?.fileName || "published data"})` : "No published routine");

    const t = loadPublishedTIF();
    if (t?.data) localStorage.setItem("ra_tif_published_v1", JSON.stringify(t));
  }, []);

  const daysList = useMemo(() => {
    const order: string[] = [];
    for (const r of rows) if (r.day && !order.includes(r.day)) order.push(r.day);
    return order.length ? order : DAY_NAMES;
  }, [rows]);

  const studentFilteredFlat = useMemo(() => {
    const qBatch = uc(fBatch);
    const dayFilter =
      fDay && fDay !== ALL_DAYS ? (r: ClassRow) => r.day === fDay : () => true;
    return rows
      .filter((r) => dayFilter(r))
      .filter((r) => (!fSlot || r.slot === fSlot))
      .filter((r) => (!qBatch || uc(r.batch).includes(qBatch)))
      .filter(isRoutineEntry);
  }, [rows, fDay, fBatch, fSlot]);

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      <h1 className="text-xl font-semibold">Teacher Portal</h1>
      {status && (
        <div className="rounded-md border bg-white px-3 py-2 text-sm text-neutral-700">{status}</div>
      )}

      <section className="rounded-2xl border p-5">
        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <TabBtn active={tab === "teacher"} onClick={() => setTab("teacher")} label="Teacher End" />
          <TabBtn active={tab === "student"} onClick={() => setTab("student")} label="Students End" />
          <TabBtn active={tab === "rooms"}   onClick={() => setTab("rooms")}   label="Empty Rooms" />
        </div>

        {/* TEACHER END (default) */}
        {tab === "teacher" && <TeacherEnd rows={rows} allowTifImport={false} />}

        {/* STUDENT END */}
        {tab === "student" && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <DayPicker value={fDay} onChange={setFDay} />
              <TextInput label="Batch Code (section)" value={fBatch} onChange={setFBatch} placeholder="e.g., 65_C" />
              <SlotPicker value={fSlot} onChange={setFSlot} />
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700">Canonical Slots</label>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                  {SLOTS.map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {!rows.length ? (
              <div className="mt-3 rounded-md border bg-white px-3 py-2 text-sm text-neutral-700">
                No published routine yet.
              </div>
            ) : (
              <StudentSchedule
                rows={rows}
                fDay={fDay}
                fBatch={fBatch}
                fSlot={fSlot}
                daysList={daysList}
                showOnlyIfAnyFilter
              />
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  import("@/lib/exporters").then(({ exportCSV }) =>
                    exportCSV(
                      studentFilteredFlat.map((r) => ({
                        Day: r.day, Slot: r.slot, Course: r.course, Batch_Section: r.batch, Teacher: r.teacher, Room: r.room,
                      })),
                      `student_${(fDay && fDay !== ALL_DAYS) ? fDay : "allDays"}_${fBatch || "all"}_${fSlot || "any"}.csv`
                    )
                  )
                }
                disabled={!studentFilteredFlat.length}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Download size={16} /> Export Filtered (CSV)
              </button>

              <button
                onClick={() =>
                  import("@/lib/exporters").then(({ exportStudentPDFStructured }) => {
                    const file = `student_${(fDay && fDay !== ALL_DAYS) ? fDay : "allDays"}_${fBatch || "all"}_${fSlot || "any"}.pdf`;
                    exportStudentPDFStructured(
                      rows,
                      { daysList, fDay, fBatch, fSlot, title: "Class Routine", institute: "Department of CSE", printedOn: new Date() },
                      file
                    );
                  })
                }
                disabled={!studentFilteredFlat.length}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border hover:bg-neutral-50"
              >
                <FileDown size={16} /> Export PDF
              </button>
            </div>
          </>
        )}

        {/* EMPTY ROOMS */}
        {tab === "rooms" && (
          <EmptyRoomTab
            rows={rows}
            erDay={erDay}
            erSlot={erSlot}
            setErDay={setErDay}
            setErSlot={setErSlot}
          />
        )}
      </section>
    </main>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium border ${active ? "bg-indigo-600 text-white" : "hover:bg-neutral-50"}`}
    >
      {label}
    </button>
  );
}
