import type { Candidate, TaskStatus } from "@/types/candidate";

function statusDot(status: TaskStatus) {
  switch (status) {
    case "DONE":
      return "bg-green-500";
    case "WAITING":
      return "bg-yellow-500";
    case "FAILED":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

function prettyTaskName(key: keyof Candidate["tasks"]) {
  const map: Record<keyof Candidate["tasks"], string> = {
    intakeForm: "Intake form received",
    employmentVerification: "Employment verified",
    referralContacted: "Referral contacted",
    referralResponses: "Referral responses received",
    backgroundCheck: "Background check complete",
  };
  return map[key];
}

export default function TaskChecklist({ tasks }: { tasks: Candidate["tasks"] }) {
  const entries = Object.entries(tasks) as [keyof Candidate["tasks"], TaskStatus][];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="font-medium mb-3">Checklist</div>

      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={String(k)} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot(v)}`} />
              <span className="text-sm">{prettyTaskName(k)}</span>
            </div>
            <span className="text-xs text-gray-500">{v.replaceAll("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
