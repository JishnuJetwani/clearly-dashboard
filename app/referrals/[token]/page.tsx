"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

export default function ReferralPage() {
  const params = useParams<{ token: string }>();
  const token = useMemo(() => {
    const t = params?.token;
    return Array.isArray(t) ? t[0] : t || "";
  }, [params]);

  const [refName, setRefName] = useState("");
  const [refPhone, setRefPhone] = useState("");
  const [refEmail, setRefEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const phone = refPhone.trim();
    if (!phone) return setError("Referral phone is required.");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/referrals/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refName: refName.trim(),
          refPhone: phone,
          refEmail: refEmail.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to submit.");

      setSuccess(true);
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
          <h1 className="text-2xl font-semibold text-slate-900">
            Referral information
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Please provide your referral’s details to continue onboarding.
          </p>

          {!token ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              Missing referral token in URL.
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-800">
                  Referral name (optional)
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                  placeholder="e.g. Jordan Lee"
                  value={refName}
                  onChange={(e) => setRefName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-800">
                  Referral phone
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                  placeholder="+1 555 123 4567"
                  value={refPhone}
                  onChange={(e) => setRefPhone(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use international format (E.164), e.g. +15551234567.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-800">
                  Referral email (optional)
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                  placeholder="jordan.lee@example.com"
                  value={refEmail}
                  onChange={(e) => setRefEmail(e.target.value)}
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  Submitted! We’ll contact your referral shortly.
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
