// src/app/admin/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FilePlus2,
  FileX,
  UploadCloud,
  Trash2,
  FileDown,
  CheckCircle2,
  X as XIcon,
} from "lucide-react";
import { parseAny } from "@/lib/parse";
import { parseTeacherInfo, TeacherInfo } from "@/lib/teachers";
import {
  ClassRow,
  DAY_NAMES,
  SLOTS,
  isRoutineEntry,
  uc,
  ALL_DAYS,
} from "@/lib/routine";
import { StudentSchedule } from "@/components/ScheduleTable";
import TeacherEnd from "@/components/TeacherEnd";
import EmptyRoomTab from "@/components/EmptyRoomTab";
import { DayPicker, SlotPicker, TextInput } from "@/components/Filters";
import { exportCSV, exportStudentPDFStructured } from "@/lib/exporters";

/* -------------------------------- types -------------------------------- */

type DraftRoutine = { fileName: string; rows: ClassRow[] } | null;
type DraftTIF = { fileName: string; list: TeacherInfo[] } | null;
type Tab = "student" | "teacher" | "rooms";

type PublishedFlags = { routine?: boolean; tif?: boolean };

/* ---------------------- helpers: normalize parseAny ---------------------- */

function asRows(maybe: any): ClassRow[] {
  if (Array.isArray(maybe)) return maybe as ClassRow[];
  if (Array.isArray(maybe?.rows)) return maybe.rows as ClassRow[];
  if (Array.isArray(maybe?.data)) return maybe.data as ClassRow[];
  return [];
}

/* --------------------------------- page --------------------------------- */

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("student");

  // drafts (not live until publish)
  const [draftRoutine, setDraftRoutine] = useState<DraftRoutine>(null);
  const [draftTif, setDraftTif] = useState<DraftTIF>(null);

  // published snapshots (fetched from server for fallback preview/meta)
  const [pubFlags, setPubFlags] = useState<PublishedFlags>({});
  const [pubRoutineMeta, setPubRoutineMeta] = useState<{ fileName?: string }>();
  const [pubTifMeta, setPubTifMeta] = useState<{ fileName?: string }>();

  // working rows used in Student/Teacher/Rooms preview section
  const [publishedRows, setPublishedRows] = useState<ClassRow[]>([]);

  // student filters
  const [fDay, setFDay] = useState<string>("");
  const [fBatch, setFBatch] = useState<string>("");
  const [fSlot, setFSlot] = useState<string>("");

  // empty room filters
  const [erDay, setErDay] = useState<string>("");
  const [erSlot, setErSlot] = useState<string>("");

  // success modal
  const [showSuccess, setShowSuccess] = useState(false);

  // TeacherEnd preview TIF (use localStorage seed key)
  const TIF_LS_KEY = "ra_tif_published_v1";
  const tifBackupRef = useRef<string | null>(null);

  /* -------------------------- initial published data -------------------------- */

  useEffect(() => {
    (async () => {
      const flags: PublishedFlags = await fetch("/api/publish", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({}));
      setPubFlags(flags || {});

      // routine
      if (flags?.routine) {
        const j = await fetch("/api/published/routine", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null
        );
        if (j?.data) {
          setPublishedRows(j.data as ClassRow[]);
          setPubRoutineMeta({ fileName: j?.meta?.fileName });
        }
      }

      // tif
      if (flags?.tif) {
        const t = await fetch("/api/published/tif", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null
        );
        if (t?.data) {
          // cache for TeacherEnd read-only consumption
          localStorage.setItem(TIF_LS_KEY, JSON.stringify(t));
          setPubTifMeta({ fileName: t?.meta?.fileName });
        }
      }
    })();
  }, []);

  /* -------------------------- TeacherEnd TIF live preview -------------------------- */

  // When an admin uploads a TIF draft, temporarily feed it to TeacherEnd via LS.
  useEffect(() => {
    if (draftTif) {
      if (tifBackupRef.current === null) {
        tifBackupRef.current = localStorage.getItem(TIF_LS_KEY);
      }
      const payload = JSON.stringify({
        data: draftTif.list,
        meta: { fileName: draftTif.fileName, preview: true },
      });
      localStorage.setItem(TIF_LS_KEY, payload);
    } else {
      if (tifBackupRef.current !== null) {
        if (tifBackupRef.current === "null") localStorage.removeItem(TIF_LS_KEY);
        else localStorage.setItem(TIF_LS_KEY, tifBackupRef.current);
        tifBackupRef.current = null;
      }
    }
  }, [draftTif]);

  useEffect(() => {
    return () => {
      if (tifBackupRef.current !== null) {
        if (tifBackupRef.current === "null") localStorage.removeItem(TIF_LS_KEY);
        else localStorage.setItem(TIF_LS_KEY, tifBackupRef.current);
      }
    };
  }, []);

  /* --------------------------------- data -------------------------------- */

  // rows shown in preview tabs = draft if present, else published from server
  const workingRows = draftRoutine?.rows ?? publishedRows;

  const daysList = useMemo(() => {
    const order: string[] = [];
    for (const r of workingRows) if (r.day && !order.includes(r.day)) order.push(r.day);
    return order.length ? order : DAY_NAMES;
  }, [workingRows]);

  const studentFilteredFlat = useMemo(() => {
    const qBatch = uc(fBatch);
    const dayFilter =
      fDay && fDay !== ALL_DAYS ? (r: ClassRow) => r.day === fDay : () => true;
    return workingRows
      .filter((r) => dayFilter(r))
      .filter((r) => (!fSlot || r.slot === fSlot))
      .filter((r) => (!qBatch || uc(r.batch).includes(qBatch)))
      .filter(isRoutineEntry);
  }, [workingRows, fDay, fBatch, fSlot]);

  /* ----------------------------- upload handlers ---------------------------- */

  const onRoutineFile = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = await parseAny(file);
      const rows = asRows(parsed).filter(isRoutineEntry);
      setDraftRoutine({ fileName: file.name, rows });
    } catch (e) {
      console.error("Failed to parse routine file:", e);
      setDraftRoutine({ fileName: file?.name || "Unknown", rows: [] });
    }
  };

  const onTifFile = async (file?: File) => {
    if (!file) return;
    try {
      const list = await parseTeacherInfo(file);
      const safe = Array.isArray(list)
        ? list
        : Array.isArray((list as any)?.rows)
        ? (list as any).rows
        : [];
      setDraftTif({ fileName: file.name, list: safe });
    } catch (e) {
      console.error("Failed to parse TIF file:", e);
      setDraftTif({ fileName: file?.name || "Unknown", list: [] });
    }
  };

  /* ------------------------------ publish/delete ----------------------------- */

  const canPublish = !!(draftRoutine || draftTif);

  const publishBoth = async () => {
    // Require BOTH to avoid half-published state (you can relax this if you prefer)
    if (!draftRoutine && !pubFlags.routine) {
      alert("Please upload a Routine file before publishing.");
      return;
    }
    if (!draftTif && !pubFlags.tif) {
      alert("Please upload a TIF file before publishing.");
      return;
    }

    const payload: any = {};

    // Routine: prefer draft; else keep published rows
    payload.routine = draftRoutine ? draftRoutine.rows : publishedRows;
    payload.routineMeta = {
      fileName: draftRoutine?.fileName || pubRoutineMeta?.fileName || "",
      publishedAt: new Date().toISOString(),
    };

    // TIF: prefer draft; else keep published (if exists)
    let tifData: any[] | undefined;
    if (draftTif) tifData = draftTif.list;
    else {
      const cached = localStorage.getItem(TIF_LS_KEY);
      if (cached) {
        const j = JSON.parse(cached);
        if (Array.isArray(j?.data)) tifData = j.data;
      }
    }
    if (!tifData || !tifData.length) {
      alert("Please upload a TIF file before publishing.");
      return;
    }
    payload.tif = tifData;
    payload.tifMeta = {
      fileName: draftTif?.fileName || pubTifMeta?.fileName || "",
      publishedAt: new Date().toISOString(),
    };

    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to publish. Please try again.");
      return;
    }

    // refresh flags + published preview
    const flags: PublishedFlags = await fetch("/api/publish", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({}));
    setPubFlags(flags || {});

    if (flags?.routine) {
      const j = await fetch("/api/published/routine", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      );
      if (j?.data) {
        setPublishedRows(j.data as ClassRow[]);
        setPubRoutineMeta({ fileName: j?.meta?.fileName });
      }
    }
    if (flags?.tif) {
      const t = await fetch("/api/published/tif", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      );
      if (t?.data) {
        localStorage.setItem(TIF_LS_KEY, JSON.stringify(t));
        setPubTifMeta({ fileName: t?.meta?.fileName });
      }
    }

    // clear drafts after successful publish
    setDraftRoutine(null);
    setDraftTif(null);

    // success modal
    setShowSuccess(true);
  };

  const clearAll = async () => {
    const ok = confirm("This will remove the cloud-published Routine and TIF. Continue?");
    if (!ok) return;
    const res = await fetch("/api/publish", { method: "DELETE" });
    if (!res.ok) return alert("Failed to unpublish.");
    setPublishedRows([]);
    setPubFlags({});
    setPubRoutineMeta(undefined);
    setPubTifMeta(undefined);
    localStorage.removeItem(TIF_LS_KEY);
    alert("Unpublished from cloud.");
  };

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Routine Admin</h1>
          <p className="text-sm text-neutral-600">
            Upload & preview (below) exactly like students/teachers see — then publish to cloud.
          </p>
        </div>
        <form action="/admin/login" method="get">
          <button
            className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
            onClick={() => (document.cookie = "ra_admin=; Max-Age=0; path=/;")}
          >
            Log out
          </button>
        </form>
      </header>

      {/* Uploaders */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Routine */}
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Routine (CSV/XLSX)</h2>
            {draftRoutine ? (
              <span className="text-xs text-neutral-500">
                Draft: {draftRoutine.fileName} · {draftRoutine.rows.length} rows
              </span>
            ) : pubFlags.routine ? (
              <span className="text-xs text-neutral-500">
                Published: {pubRoutineMeta?.fileName || "—"}
              </span>
            ) : (
              <span className="text-xs text-neutral-500">No routine published</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <FilePlus2 size={16} /> Choose file
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => onRoutineFile(e.target.files?.[0])}
                className="hidden"
              />
            </label>

            <button
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
              disabled={!workingRows.length}
              onClick={() =>
                exportCSV(workingRows, `routine_preview_${Date.now()}.csv`)
              }
            >
              <Download size={16} /> Export current as CSV
            </button>

            {draftRoutine && (
              <button
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setDraftRoutine(null)}
              >
                <FileX size={16} /> Discard draft
              </button>
            )}
          </div>
        </div>

        {/* TIF */}
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Teacher Info (TIF) — CSV/XLSX</h2>
            {draftTif ? (
              <span className="text-xs text-neutral-500">
                Draft: {draftTif.fileName} · {draftTif.list.length} records
              </span>
            ) : pubFlags.tif ? (
              <span className="text-xs text-neutral-500">
                Published: {pubTifMeta?.fileName || "—"}
              </span>
            ) : (
              <span className="text-xs text-neutral-500">No TIF published</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <FilePlus2 size={16} /> Choose file
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => onTifFile(e.target.files?.[0])}
                className="hidden"
              />
            </label>

            {draftTif && (
              <button
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => setDraftTif(null)}
              >
                <FileX size={16} /> Discard draft
              </button>
            )}
          </div>
        </div>
      </section>

      {/* PREVIEW (identical tabs as portals) */}
      <section className="rounded-2xl border p-5">
        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <TabBtn active={tab === "student"} onClick={() => setTab("student")} label="Students End" />
          <TabBtn active={tab === "teacher"} onClick={() => setTab("teacher")} label="Teacher End" />
          <TabBtn active={tab === "rooms"}   onClick={() => setTab("rooms")}   label="Empty Rooms" />
        </div>

        {/* STUDENT END (preview) */}
        {tab === "student" && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <DayPicker value={fDay} onChange={setFDay} />
              <TextInput
                label="Batch Code (section)"
                value={fBatch}
                onChange={setFBatch}
                placeholder="e.g., 65_C"
              />
              <SlotPicker value={fSlot} onChange={setFSlot} />
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

            {!workingRows.length ? (
              <div className="mt-3 rounded-md border bg-white px-3 py-2 text-sm text-neutral-700">
                Upload a routine file to preview.
              </div>
            ) : (
              <StudentSchedule
                rows={workingRows}
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
                  exportCSV(
                    studentFilteredFlat.map((r) => ({
                      Day: r.day,
                      Slot: r.slot,
                      Course: r.course,
                      Batch_Section: r.batch,
                      Teacher: r.teacher,
                      Room: r.room,
                    })),
                    `student_${(fDay && fDay !== ALL_DAYS) ? fDay : "allDays"}_${fBatch || "all"}_${fSlot || "any"}.csv`
                  )
                }
                disabled={!studentFilteredFlat.length}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Download size={16} /> Export Filtered (CSV)
              </button>

              <button
                onClick={() => {
                  const file = `student_${(fDay && fDay !== ALL_DAYS) ? fDay : "allDays"}_${fBatch || "all"}_${fSlot || "any"}.pdf`;
                  exportStudentPDFStructured(
                    workingRows,
                    {
                      daysList,
                      fDay,
                      fBatch,
                      fSlot,
                      title: "Class Routine",
                      institute: "Department of CSE",
                      printedOn: new Date(),
                    },
                    file
                  );
                }}
                disabled={!studentFilteredFlat.length}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border hover:bg-neutral-50"
              >
                <FileDown size={16} /> Export PDF
              </button>
            </div>
          </>
        )}

        {/* TEACHER END (Admin can import TIF here too via top uploader preview) */}
        {tab === "teacher" && <TeacherEnd rows={workingRows} allowTifImport={true} />}

        {/* EMPTY ROOMS */}
        {tab === "rooms" && (
          <EmptyRoomTab
            rows={workingRows}
            erDay={erDay}
            erSlot={erSlot}
            setErDay={setErDay}
            setErSlot={setErSlot}
          />
        )}
      </section>

      {/* Publish / Delete */}
      <section className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            disabled={!canPublish && !pubFlags.routine && !pubFlags.tif}
            onClick={publishBoth}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <UploadCloud size={16} /> Publish Drafts
          </button>
          <span className="text-xs text-neutral-600">
            Previous data remains live until you publish.
          </span>
        </div>

        <button
          onClick={clearAll}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 text-red-600 border-red-200"
        >
          <Trash2 size={16} /> Unpublish / Delete Previous
        </button>
      </section>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-700">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Published successfully</h3>
                <p className="text-xs text-neutral-500">Students & Teachers will see the new data now.</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border bg-neutral-50 p-3 text-sm">
              <div>
                <span className="font-medium">Routine:</span>{" "}
                {draftRoutine?.fileName || pubRoutineMeta?.fileName || "—"}
              </div>
              <div className="mt-1">
                <span className="font-medium">TIF:</span>{" "}
                {draftTif?.fileName || pubTifMeta?.fileName || "—"}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowSuccess(false)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
              >
                <XIcon size={16} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- UI bits -------------------------------- */

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium border ${
        active ? "bg-indigo-600 text-white" : "hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );
}
