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
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "ONBOARDING_COMPLETE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "DECISION":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "BACKGROUND_CHECK":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "REFERRAL_OUTREACH":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "EMPLOYMENT_VERIFY":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function riskChip(score: number) {
  if (score >= 67) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (score >= 34) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function tasksSummary(tasks: Candidate["tasks"]) {
  const vals = Object.values(tasks);
  const done = vals.filter((t) => t === "DONE").length;
  const waiting = vals.filter((t) => t === "WAITING").length;
  const failed = vals.filter((t) => t === "FAILED").length;
  return { done, total: vals.length, waiting, failed };
}

export default function CandidateTable({ rows }: { rows: Candidate[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Candidate</th>
              <th className="text-left px-5 py-3 font-medium">Stage</th>
              <th className="text-left px-5 py-3 font-medium">Progress</th>
              <th className="text-left px-5 py-3 font-medium">Risk</th>
              <th className="text-left px-5 py-3 font-medium">Last activity</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => {
              const { done, total, waiting, failed } = tasksSummary(c.tasks);
              const needsAction = failed > 0 || waiting > 0;
              const pct = Math.round((done / total) * 100);

              return (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-b from-slate-100 to-white ring-1 ring-slate-200 grid place-items-center font-semibold text-slate-700">
                        {initials(c.fullName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-slate-900 truncate">
                            {c.fullName}
                          </div>
                          {needsAction && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                              Needs action
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{c.roleApplied}</div>
                        <div className="text-xs text-slate-400 truncate">{c.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${stageChip(
                        c.stage
                      )}`}
                    >
                      {stageLabel(c.stage)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-40 h-2.5 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-violet-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-600">
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
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${riskChip(
                        c.risk.score
                      )}`}
                    >
                      {c.risk.score}/100
                    </span>
                    {c.risk.flags.length > 0 && (
                      <div className="mt-1 text-xs text-slate-500 line-clamp-1">
                        {c.risk.flags.join(", ")}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {fmtUTC(c.lastActivityAt)}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      className="inline-flex items-center rounded-2xl px-3 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
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
