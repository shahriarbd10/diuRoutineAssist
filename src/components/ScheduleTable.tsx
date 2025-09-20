// components/ScheduleTable.tsx
"use client";

import { motion } from "framer-motion";
import React, { useMemo } from "react";
import {
  ClassRow,
  SLOTS,
  uc,
  isRoutineEntry,
  ALL_DAYS,
} from "@/lib/routine";

export function StudentSchedule({
  rows,
  fDay,
  fBatch,
  fSlot,
  daysList,
  showOnlyIfAnyFilter,
}: {
  rows: ClassRow[];
  fDay: string;
  fBatch: string;
  fSlot: string;
  daysList: string[];
  showOnlyIfAnyFilter?: boolean;
}) {
  const hasAny = !!(fDay || fBatch || fSlot);
  if (showOnlyIfAnyFilter && !hasAny)
    return <EmptyHint text="Pick any of Day / Batch / Slot to see routine." />;

  const qBatch = uc(fBatch);
  const isAllDays = fDay === ALL_DAYS;

  const single = useMemo(() => {
    if (!fDay || isAllDays) return SLOTS.map(() => [] as ClassRow[]);
    return SLOTS.map((slot) =>
      rows
        .filter(
          (r) =>
            r.day === fDay &&
            (!fSlot || r.slot === fSlot) &&
            r.slot === slot &&
            (!qBatch || uc(r.batch).includes(qBatch))
        )
        .filter(isRoutineEntry)
    );
  }, [rows, fDay, fSlot, qBatch, isAllDays]);

  const overview = useMemo(() => {
    if (fDay && !isAllDays) return {};
    const by: Record<string, ClassRow[][]> = {};
    for (const day of daysList) {
      by[day] = SLOTS.map((slot) =>
        rows
          .filter(
            (r) =>
              r.day === day &&
              r.slot === slot &&
              (!fSlot || r.slot === fSlot) &&
              (!qBatch || uc(r.batch).includes(qBatch))
          )
          .filter(isRoutineEntry)
      );
    }
    return by;
  }, [rows, daysList, fDay, fSlot, qBatch, isAllDays]);

  return fDay && !isAllDays ? (
    <GridSingleDay day={fDay} matrix={single} />
  ) : (
    <GridMultiDay daysList={daysList} matrixByDay={overview as any} />
  );
}

export function TeacherSchedule({
  rows,
  fTeacher,
  fSlot,
  daysList,
  showOnlyIfAnyFilter,
  exactInitial, // when provided, match teacher exactly
}: {
  rows: ClassRow[];
  fTeacher: string;
  fSlot: string;
  daysList: string[];
  showOnlyIfAnyFilter?: boolean;
  exactInitial?: string | null;
}) {
  const hasAny = !!(fTeacher || fSlot || exactInitial);
  if (showOnlyIfAnyFilter && !hasAny)
    return <EmptyHint text="Pick a teacher or slot to see routine." />;

  const qT = uc(fTeacher);

  const byDay = useMemo(() => {
    const by: Record<string, ClassRow[][]> = {};
    for (const day of daysList) {
      by[day] = SLOTS.map((slot) =>
        rows
          .filter((r) => r.day === day && r.slot === slot)
          .filter((r) => (!fSlot || r.slot === fSlot))
          .filter((r) =>
            exactInitial ? uc(r.teacher) === exactInitial : (!qT ? true : uc(r.teacher).includes(qT))
          )
          .filter(isRoutineEntry)
      );
    }
    return by;
  }, [rows, daysList, fSlot, qT, exactInitial]);

  return <GridMultiDay daysList={daysList} matrixByDay={byDay} />;
}

/* ---------- tiny presentational helpers ---------- */

function GridSingleDay({ day, matrix }: { day: string; matrix: ClassRow[][] }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <div className="min-w-[900px] rounded-xl border" id="schedule-student">
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
            <tr className="align-top">
              <td className="whitespace-nowrap px-3 py-3 font-medium">{day}</td>
              {SLOTS.map((slot, idx) => (
                <td key={slot} className="px-3 py-3">
                  <Cell items={matrix[idx]} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GridMultiDay({
  daysList,
  matrixByDay,
}: {
  daysList: string[];
  matrixByDay: Record<string, ClassRow[][]>;
}) {
  return (
    <div className="mt-6 overflow-x-auto">
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
              const rowCells = matrixByDay[day];
              const total = rowCells?.reduce((acc, arr) => acc + arr.length, 0) || 0;
              if (!total) return null;
              return (
                <tr key={day} className="align-top">
                  <td className="whitespace-nowrap px-3 py-3 font-medium">{day}</td>
                  {SLOTS.map((slot, idx) => (
                    <td key={`${day}-${slot}`} className="px-3 py-3">
                      <Cell items={rowCells[idx]} />
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
              {r.teacher && <span>👩‍🏫 {r.teacher}</span>}
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

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-md border bg-white px-3 py-2 text-sm text-neutral-700">
      {text}
    </div>
  );
}
