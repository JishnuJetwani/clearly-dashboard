import Link from "next/link";
import { notFound } from "next/navigation";
import StageStepper from "@/components/StageStepper";
import TaskChecklist from "@/components/TaskChecklist";
import { getCandidateByIdDb } from "../../../lib/candidatesRepo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtUTC(iso: string) {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const c = await getCandidateByIdDb(id);
  if (!c) return notFound();

  const activity = (c as any).activity as { at: string; label: string }[] | undefined;
  const messages = (c as any).messages as
    | { at: string; channel: "email" | "sms"; subject: string; status: "sent" | "delivered" | "failed" }[]
    | undefined;

  const sortedActivity = (activity ?? []).slice().sort((a, b) => {
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });

  const sortedMessages = (messages ?? []).slice().sort((a, b) => {
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link className="text-sm text-slate-700 hover:underline" href="/dashboard">
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold mt-2 text-slate-900">{c.fullName}</h1>
            <p className="text-sm text-slate-600">
              {c.roleApplied} • {c.email}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm px-4 py-3">
            <div className="text-xs text-slate-500">Risk</div>
            <div className="text-lg font-semibold text-slate-900">{c.risk.score}/100</div>
            {c.risk.flags.length > 0 && (
              <div className="text-xs text-slate-600">{c.risk.flags.join(", ")}</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
          <div className="font-medium text-slate-900">Stage</div>
          <StageStepper stage={c.stage} />
          <div className="text-xs text-slate-500">
            Created: {fmtUTC(c.createdAt)} • Last activity: {fmtUTC(c.lastActivityAt)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
              <div className="font-medium mb-3 text-slate-900">Activity</div>

              {sortedActivity.length === 0 ? (
                <div className="text-sm text-slate-500">No activity yet.</div>
              ) : (
                <ul className="text-sm text-slate-700 space-y-2">
                  {sortedActivity.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-4">
                      <span>{item.label}</span>
                      <span className="text-xs text-slate-500">{fmtUTC(item.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
              <div className="font-medium mb-3 text-slate-900">Messages</div>

              {sortedMessages.length === 0 ? (
                <div className="text-sm text-slate-500">No messages yet.</div>
              ) : (
                <ul className="text-sm text-slate-700 space-y-2">
                  {sortedMessages.map((m, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-4">
                      <span>
                        {m.channel === "email" ? "📧" : "💬"} {m.subject}{" "}
                        <span className="text-xs text-slate-500">({m.status})</span>
                      </span>
                      <span className="text-xs text-slate-500">{fmtUTC(m.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <TaskChecklist tasks={c.tasks} />
          </div>
        </div>
      </div>
    </main>
  );
}
