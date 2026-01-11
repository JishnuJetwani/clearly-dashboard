import type { Candidate, TaskStatus } from "@/types/candidate";

function prettyTaskName(key: keyof Candidate["tasks"]) {
  const map: Record<keyof Candidate["tasks"], string> = {
    intakeForm: "Intake form received",
    employmentVerification: "Employment verified",
    referralContacted: "Referral contacted",
    referralResponses: "Reference response received",
    backgroundCheck: "Background check complete",
  };
  return map[key];
}

function statusPill(status: TaskStatus) {
  switch (status) {
    case "DONE":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "WAITING":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "FAILED":
      return "bg-rose-50 text-rose-800 ring-rose-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function statusLabel(status: TaskStatus) {
  switch (status) {
    case "DONE":
      return "Done";
    case "WAITING":
      return "In progress";
    case "FAILED":
      return "Needs review";
    default:
      return "Not started";
  }
}

function dot(status: TaskStatus) {
  switch (status) {
    case "DONE":
      return "bg-emerald-600";
    case "WAITING":
      return "bg-amber-500";
    case "FAILED":
      return "bg-rose-600";
    default:
      return "bg-slate-300";
  }
}

export default function TaskChecklist({ tasks }: { tasks: Candidate["tasks"] }) {
  const entries = Object.entries(tasks) as [keyof Candidate["tasks"], TaskStatus][];
  const done = entries.filter(([, v]) => v === "DONE").length;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Checklist</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {done}/{entries.length} completed
          </div>
        </div>
        <div className="text-xs font-medium text-slate-500 tabular-nums">
          {Math.round((done / Math.max(entries.length, 1)) * 100)}%
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {entries.map(([k, v]) => (
          <div
            key={String(k)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2.5 w-2.5 rounded-full ${dot(v)}`} />
              <span className="text-sm text-slate-900 truncate">{prettyTaskName(k)}</span>
            </div>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusPill(
                v
              )}`}
            >
              {statusLabel(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
