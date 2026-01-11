"use client";

import { useState } from "react";

export default function ReferralPage({ params }: { params: { token: string } }) {
  const token = params.token;

  const [refName, setRefName] = useState("");
  const [refPhone, setRefPhone] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("saving");

    const res = await fetch(`/api/referrals/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refName, refPhone, refEmail }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Failed to submit.");
      setStatus("error");
      return;
    }

    setStatus("done");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto p-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Reference details</h1>
          <p className="mt-1 text-sm text-slate-600">
            Please provide your referral’s contact info so we can complete verification.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div>
              <label className="text-sm font-medium">Referral name</label>
              <input className="mt-1 w-full rounded-2xl border px-4 py-2"
                value={refName} onChange={(e) => setRefName(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Referral phone</label>
              <input className="mt-1 w-full rounded-2xl border px-4 py-2"
                placeholder="+1..."
                value={refPhone} onChange={(e) => setRefPhone(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Referral email (optional)</label>
              <input className="mt-1 w-full rounded-2xl border px-4 py-2"
                value={refEmail} onChange={(e) => setRefEmail(e.target.value)} />
            </div>

            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            <button
              disabled={status === "saving"}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-white font-semibold disabled:opacity-50"
            >
              {status === "saving" ? "Submitting..." : "Submit"}
            </button>

            {status === "done" && (
              <p className="text-sm text-emerald-700 mt-2">
                Submitted! You can close this tab.
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
