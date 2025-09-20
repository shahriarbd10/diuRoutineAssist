// components/Filters.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search, UserSearch, X } from "lucide-react";
import { DAY_NAMES, SLOTS, ALL_DAYS } from "@/lib/routine";

/* ----------------- shared inputs ----------------- */

export const TextInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-neutral-700">{label}</label>
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-white pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 hover:border-neutral-400"
      />
    </div>
  </div>
);

export const DayPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-neutral-700">Day</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 hover:border-neutral-400"
    >
      <option value="">(pick a day)</option>
      <option value={ALL_DAYS}>(show all days)</option>
      {DAY_NAMES.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  </div>
);

export const SlotPicker = ({
  value,
  onChange,
  label = "Slot (optional)",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-neutral-700">{label}</label>
    <div className="relative">
      <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 hover:border-neutral-400"
      >
        <option value="">(any slot)</option>
        {SLOTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  </div>
);

/* ---------- NEW: ERSlotPicker (adds "(whole day)" option) ---------- */

export const ER_WHOLE_DAY = "(whole day)";

export const ERSlotPicker = ({
  value,
  onChange,
  label = "Slot or Whole Day",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-neutral-700">{label}</label>
    <div className="relative">
      <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 hover:border-neutral-400"
      >
        <option value="">{/* keep empty to force a choice */}(pick one)</option>
        <option value={ER_WHOLE_DAY}>{ER_WHOLE_DAY}</option>
        {SLOTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  </div>
);

/* ----------------- NEW: InitialPicker ----------------- */

export type InitialOption = { initial: string; name?: string };

export function InitialPicker({
  value,
  onChange,
  options,
  label = "Teacher (Initial) — search or type",
  placeholder = "e.g., AM or type a name",
}: {
  value: string;
  onChange: (v: string) => void;
  options: InitialOption[];
  label?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = options.slice().sort((a, b) => a.initial.localeCompare(b.initial));
    if (!q) return arr.slice(0, 10);
    return arr
      .filter(
        (o) =>
          o.initial.toLowerCase().includes(q) ||
          (o.name || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [options, query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const accept = (initial: string) => {
    onChange(initial);
    setQuery(initial);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = query.trim().toUpperCase();
      const hit = options.find((o) => o.initial.toUpperCase() === q);
      if (hit) accept(hit.initial);
      else if (filtered[0]) accept(filtered[0].initial);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-1" ref={wrapRef}>
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <div className="relative">
        <UserSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-md border bg-white pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 hover:border-neutral-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
              setOpen(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            aria-label="Clear"
            title="Clear"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {filtered.length ? (
            filtered.map((opt) => (
              <button
                key={opt.initial}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onClick={() => accept(opt.initial)}
              >
                <span className="font-medium">{opt.initial}</span>
                {opt.name ? <span className="text-neutral-500"> — {opt.name}</span> : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-neutral-500">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
