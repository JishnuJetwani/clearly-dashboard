"use client";

import { useEffect, useMemo, useState } from "react";
import type { Candidate, Stage } from "@/types/candidate";
import CandidateTable from "@/components/CandidateTable";
import Link from "next/link";

type StageFilter = Stage | "ALL";

function needsAction(c: Candidate) {
  const vals = Object.values(c.tasks);
  // keep this logic: waiting/failed items should show "Needs action"
  return vals.includes("FAILED") || vals.includes("WAITING");
}

export default function DashboardClient({ initialRows }: { initialRows: Candidate[] }) {
  const [rows, setRows] = useState<Candidate[]>(initialRows);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<StageFilter>("ALL");
  const [onlyNeedsAction, setOnlyNeedsAction] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/candidates", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Candidate[];
        if (!cancelled) setRows(data);
      } catch {
        // ignore
      }
    }

    refresh();
    const t = setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const action = rows.filter(needsAction).length;
    const flagged = rows.filter((c) => c.stage === "FLAGGED").length;
    const humanCheck = rows.filter((c) => c.humanCheckNeeded).length;
    return { total, action, flagged, humanCheck };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let current = rows;

    if (q) {
      current = current.filter((c) =>
        `${c.fullName} ${c.email} ${c.roleApplied}`.toLowerCase().includes(q)
      );
    }
    if (stage !== "ALL") current = current.filter((c) => c.stage === stage);
    if (onlyNeedsAction) current = current.filter(needsAction);

    return [...current].sort((a, b) => {
      // 1) Flagged first
      const aFlag = a.stage === "FLAGGED" ? 1 : 0;
      const bFlag = b.stage === "FLAGGED" ? 1 : 0;
      if (aFlag !== bFlag) return bFlag - aFlag;

      // 2) Human check needed next
      const aHC = a.humanCheckNeeded ? 1 : 0;
      const bHC = b.humanCheckNeeded ? 1 : 0;
      if (aHC !== bHC) return bHC - aHC;

      // 3) Needs action next
      const aNeed = needsAction(a) ? 1 : 0;
      const bNeed = needsAction(b) ? 1 : 0;
      if (aNeed !== bNeed) return bNeed - aNeed;

      // 4) Most recently active first
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  }, [rows, query, stage, onlyNeedsAction]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm p-6 overflow-hidden relative">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.35]"
            style={{
              background:
                "radial-gradient(900px circle at 15% 20%, rgba(99,102,241,0.18), transparent 40%), radial-gradient(700px circle at 80% 10%, rgba(16,185,129,0.14), transparent 45%), radial-gradient(900px circle at 80% 80%, rgba(244,63,94,0.10), transparent 45%)",
            }}
          />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-medium">
                HR Ops • Agent Dashboard
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                Employer Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Track candidates across intake, verification, referrals, and decisions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">{filtered.length}</span>{" "}
                candidates
              </div>

              <Link
                href="/candidates/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                <span className="text-base leading-none">+</span>
                Add candidate
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} tone="slate" />
          <StatCard label="Needs action" value={stats.action} tone="amber" />
          <StatCard label="Flagged" value={stats.flagged} tone="rose" />
          <StatCard label="Human check" value={stats.humanCheck} tone="violet" />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <input
                  className="w-full sm:w-80 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                  placeholder="Search name, email, role…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  ⌘K
                </div>
              </div>

              <select
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                value={stage}
                onChange={(e) => setStage(e.target.value as StageFilter)}
              >
                <option value="ALL">All stages</option>
                <option value="INTAKE">INTAKE</option>
                <option value="REFERRAL_OUTREACH">REFERRAL OUTREACH</option>
                <option value="BACKGROUND_CHECK">BACKGROUND CHECK</option>
                <option value="DECISION">DECISION</option>
                <option value="ONBOARDING_COMPLETE">ONBOARDING COMPLETE</option>
                <option value="FLAGGED">FLAGGED</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
              <input
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                type="checkbox"
                checked={onlyNeedsAction}
                onChange={(e) => setOnlyNeedsAction(e.target.checked)}
              />
              Needs action
            </label>
          </div>
        </div>

        <CandidateTable rows={filtered} />
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "rose" | "violet";
}) {
  const tones: Record<typeof tone, { ring: string; dot: string }> = {
    slate: { ring: "ring-slate-200", dot: "bg-slate-900" },
    amber: { ring: "ring-amber-200", dot: "bg-amber-500" },
    rose: { ring: "ring-rose-200", dot: "bg-rose-600" },
    violet: { ring: "ring-violet-200", dot: "bg-violet-600" },
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-600">{label}</div>
        <div className={`h-9 w-9 rounded-2xl grid place-items-center ring-1 ${tones[tone].ring}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${tones[tone].dot}`} />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}
