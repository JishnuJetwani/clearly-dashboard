import Link from "next/link";
import type { Candidate, Stage } from "@/types/candidate";

function fmtUTC(iso: string) {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function stageLabel(stage: Stage) {
  return stage.replaceAll("_", " ");
}

function stageChip(stage: Stage) {
  switch (stage) {
    case "FLAGGED":
      return "bg-rose-50 text-rose-800 ring-rose-200";
    case "ONBOARDING_COMPLETE":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "DECISION":
      return "bg-indigo-50 text-indigo-800 ring-indigo-200";
    case "BACKGROUND_CHECK":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "REFERRAL_OUTREACH":
      return "bg-violet-50 text-violet-800 ring-violet-200";
    case "INTAKE":
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function tasksSummary(tasks: Candidate["tasks"]) {
  const vals = Object.values(tasks);
  const done = vals.filter((t) => t === "DONE").length;
  const waiting = vals.filter((t) => t === "WAITING").length;
  const failed = vals.filter((t) => t === "FAILED").length;
  return { done, total: vals.length, waiting, failed };
}

function humanChip(needed: boolean) {
  return needed
    ? "bg-rose-50 text-rose-800 ring-rose-200"
    : "bg-emerald-50 text-emerald-800 ring-emerald-200";
}

export default function CandidateTable({ rows }: { rows: Candidate[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Candidate</th>
              <th className="text-left px-5 py-3 font-semibold">Stage</th>
              <th className="text-left px-5 py-3 font-semibold">Progress</th>
              <th className="text-left px-5 py-3 font-semibold">Human check</th>
              <th className="text-left px-5 py-3 font-semibold">Last activity</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => {
              const { done, total, waiting, failed } = tasksSummary(c.tasks);
              const needsAction = failed > 0 || waiting > 0;
              const pct = Math.round((done / Math.max(total, 1)) * 100);

              return (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-white ring-1 ring-slate-200 grid place-items-center font-semibold text-slate-700">
                        {initials(c.fullName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/candidates/${encodeURIComponent(c.id)}`}
                            className="font-semibold text-slate-900 truncate hover:underline"
                          >
                            {c.fullName}
                          </Link>
                          {needsAction && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">
                              Needs action
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{c.roleApplied || "—"}</div>
                        <div className="text-xs text-slate-400 truncate">{c.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${stageChip(
                        c.stage
                      )}`}
                    >
                      {stageLabel(c.stage)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-40 h-2.5 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200">
                        <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-slate-600 tabular-nums">
                        <span className="font-semibold text-slate-900">{done}</span>/{total}
                        <span className="text-slate-400"> • {pct}%</span>
                        {(failed > 0 || waiting > 0) && (
                          <span className="text-slate-400">
                            {" "}
                            • {waiting} waiting • {failed} failed
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${humanChip(
                        c.humanCheckNeeded
                      )}`}
                    >
                      {c.humanCheckNeeded ? "Yes" : "No"}
                    </span>
                    {c.humanCheckNeeded && c.humanCheckReasons?.length > 0 && (
                      <div className="mt-1 text-xs text-slate-500">
                        {c.humanCheckReasons.join(", ")}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600 tabular-nums">{fmtUTC(c.lastActivityAt)}</td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      className="inline-flex items-center rounded-2xl px-3 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                      href={`/candidates/${encodeURIComponent(c.id)}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
