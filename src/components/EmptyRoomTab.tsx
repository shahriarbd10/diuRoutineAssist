// components/EmptyRoomTab.tsx
"use client";

import React, { useMemo } from "react";
import { DayPicker, SlotPicker } from "./Filters";
import {
  ClassRow,
  SLOTS,
  isRoomCandidate,
  isRoutineEntry,
} from "@/lib/routine";
import { motion } from "framer-motion";

/**
 * Behavior:
 * - DAY selected + SLOT selected   -> rooms empty in that specific slot.
 * - DAY selected + SLOT not set    -> for the whole day, show groups:
 *                                     for each slot, list the rooms empty in that slot.
 *
 * Occupied definition (strict):
 *  a row is "occupied" if it looks like a real routine entry with a room
 *  AND there is ANY course OR ANY teacher text on that row.
 *  (This avoids false "empty" due to partial data.)
 */

export default function EmptyRoomTab({
  rows,
  erDay,
  erSlot,
  setErDay,
  setErSlot,
}: {
  rows: ClassRow[];
  erDay: string;
  erSlot: string;
  setErDay: (v: string) => void;
  setErSlot: (v: string) => void;
}) {
  const data = useMemo(() => {
    const norm = (s?: string) => (s || "").trim();
    const key = (s?: string) => norm(s).toUpperCase();

    const isOccupied = (r: ClassRow) => !!(norm(r.course) || norm(r.teacher));

    if (!erDay) return { mode: "idle" as const, bySlot: new Map<string, string[]>(), single: [] as string[] };

    // valid rows for the chosen day that look like schedule entries and have a room value
    const dayRows = rows.filter(
      (r) => r.day === erDay && isRoutineEntry(r) && isRoomCandidate(r.room)
    );

    // helper: compute empty rooms for a given slot
    const emptyForSlot = (slot: string) => {
      const slotRows = dayRows.filter((r) => r.slot === slot);
      const empties = slotRows.filter((r) => !isOccupied(r)).map((r) => norm(r.room));

      // dedupe case-insensitively
      const seen = new Set<string>();
      const out: string[] = [];
      for (const name of empties) {
        const k = key(name);
        if (!seen.has(k)) {
          seen.add(k);
          out.push(name);
        }
      }
      out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      return out;
    };

    if (erSlot) {
      return { mode: "single" as const, bySlot: new Map<string, string[]>(), single: emptyForSlot(erSlot) };
    }

    // No slot selected: build a grouped map slot -> empty rooms
    const bySlot = new Map<string, string[]>();
    for (const s of SLOTS) {
      const arr = emptyForSlot(s);
      if (arr.length) bySlot.set(s, arr);
    }
    return { mode: "group" as const, bySlot, single: [] as string[] };
  }, [rows, erDay, erSlot]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <DayPicker value={erDay} onChange={setErDay} />
        <SlotPicker value={erSlot} onChange={setErSlot} label="Slot (optional)" />
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Canonical Slots</label>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
            {SLOTS.map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Messages & results */}
      {!erDay ? (
        <div className="mt-4 rounded-md border bg-white px-3 py-2 text-sm text-neutral-700">
          Pick a Day to see empty rooms. (Choose a Slot to narrow to that slot; leave blank to see all slots for the day.)
        </div>
      ) : data.mode === "single" ? (
        // Specific slot selected
        data.single.length === 0 ? (
          <div className="mt-6 text-sm text-neutral-600">
            No empty rooms detected for <b>{erDay}</b>, <b>{erSlot}</b>.
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {data.single.map((room, i) => (
              <motion.div
                key={`${room}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border p-3"
              >
                <div className="font-semibold">{room}</div>
                <div className="text-xs text-neutral-500 mt-1">
                  {erDay} • {erSlot} • Empty
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : data.mode === "group" ? (
        // Grouped by slot for the whole day
        data.bySlot.size === 0 ? (
          <div className="mt-6 text-sm text-neutral-600">
            No empty rooms detected for <b>{erDay}</b> in any slot.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {SLOTS.filter((s) => data.bySlot.has(s)).map((slot) => {
              const list = data.bySlot.get(slot)!;
              return (
                <div key={slot}>
                  <div className="mb-2 text-sm font-semibold text-neutral-700">{slot}</div>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {list.map((room, i) => (
                      <motion.div
                        key={`${slot}-${room}-${i}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border p-3"
                      >
                        <div className="font-semibold">{room}</div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {erDay} • {slot} • Empty
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}
    </>
  );
}
