"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCandidatePage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [successLink, setSuccessLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessLink(null);

    const name = fullName.trim();
    const mail = email.trim().toLowerCase();
    const company = companyName.trim();

    if (!name) return setError("Name is required.");
    if (!mail || !mail.includes("@")) return setError("Enter a valid email.");
    if (!company) return setError("Company name is required.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/workflows/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name, email: mail, companyName: company }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to start workflow.");
      }

      // Helpful for local dev: show the referral link that was emailed
      if (data?.referralLink) {
        setSuccessLink(String(data.referralLink));
      }

      // Send them back to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-xl mx-auto p-6">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Add candidate</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter the candidate’s details to start the intake workflow (email → referral form → reference call).
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-800">Name</label>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                placeholder="e.g. Sam Taylor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">Email</label>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                placeholder="sam.taylor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">Company</label>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            {successLink && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div className="font-semibold">Workflow started.</div>
                <div className="mt-1">
                  Referral link (also emailed):
                  <a className="ml-2 underline" href={successLink}>
                    {successLink}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Starting…" : "Add candidate"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-6 text-xs text-slate-500">
            Note: if you’re testing with real emails, make sure <code>NEXT_PUBLIC_BASE_URL</code> points to a reachable URL
            (deployed URL or ngrok), not localhost.
          </div>
        </div>
      </div>
    </main>
  );
}
