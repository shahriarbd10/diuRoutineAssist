// app/page.tsx
"use client";

import Link from "next/link";
import { GraduationCap, Users, LogIn } from "lucide-react";

export default function Landing() {
  return (
    <main className="min-h-[70vh]">
      <div className="flex items-center justify-end p-4">
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
        >
          <LogIn size={16} /> Admin Login
        </Link>
      </div>

      <div className="mx-auto grid max-w-5xl place-items-center px-6 py-16 text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">DIU Routine Assist</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          View the latest published routine. Choose your portal.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/student"
            className="inline-flex items-center gap-3 rounded-xl bg-indigo-600 px-6 py-3 text-white text-sm font-medium hover:bg-indigo-700"
          >
            <GraduationCap size={18} /> Enter as Student
          </Link>
          <Link
            href="/teacher"
            className="inline-flex items-center gap-3 rounded-xl border px-6 py-3 text-sm font-medium hover:bg-neutral-50"
          >
            <Users size={18} /> Enter as Teacher
          </Link>
        </div>

        <p className="mt-6 text-xs text-neutral-500">
          Admins can upload, preview, publish, or delete data from the admin panel.
        </p>
      </div>
    </main>
  );
}
