// src/app/admin/login/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Home, Lock } from "lucide-react";

export const dynamic = "force-static";

async function loginAction(formData: FormData) {
  "use server";
  const pass = String(formData.get("pass") || "");
  if (!process.env.ADMIN_PASS) throw new Error("ADMIN_PASS is not set");

  if (pass === process.env.ADMIN_PASS) {
    const c = await cookies(); // Next 15: must await cookies()
    c.set({
      name: "ra_admin",
      value: "yes",
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    redirect(String(formData.get("next") || "/admin"));
  }

  redirect("/admin/login?err=1");
}

export default function Page({
  searchParams,
}: {
  searchParams: { err?: string; next?: string };
}) {
  const err = searchParams?.err === "1";
  const next = searchParams?.next || "/admin";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          <Home size={18} />
          Back to Home
        </a>

        <div className="text-sm text-neutral-500">
          DIU Routine Assist <span className="text-neutral-300">•</span>{" "}
          Admin Console
        </div>
      </header>

      {/* Centered Card */}
      <main className="mx-auto grid min-h-[70vh] w-full max-w-6xl place-items-center px-6">
        <form
          action={loginAction}
          className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white/80 p-6 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.2)] backdrop-blur-[2px]"
        >
          {/* Brand / Title */}
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">
              <Lock size={18} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Administrator Login
              </h1>
              <p className="text-xs text-neutral-500">
                Restricted area — authorized users only.
              </p>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Incorrect password. Please try again.
            </div>
          )}

          {/* Hidden next */}
          <input type="hidden" name="next" value={next} />

          {/* Password field */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">
              Password
            </label>
            <input
              name="pass"
              type="password"
              required
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Home size={16} />
              Home
            </a>
            <button
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              Sign in
            </button>
          </div>

          {/* Footer note */}
          <p className="mt-4 text-center text-xs text-neutral-400">
            Your session stays active for up to 8 hours.
          </p>
        </form>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-6xl px-6 pb-8">
        <div className="rounded-xl border border-neutral-200 bg-white/60 px-4 py-3 text-center text-xs text-neutral-500 backdrop-blur">
          © {new Date().getFullYear()} DIU Routine Assist — Admin Panel
        </div>
      </footer>
    </div>
  );
}
