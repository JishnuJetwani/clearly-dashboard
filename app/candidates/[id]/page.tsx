import Link from "next/link";
import { notFound } from "next/navigation";
import StageStepper from "@/components/StageStepper";
import AutoRefresh from "@/components/AutoRefresh";
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

  const status = (c as any).status as string | undefined;
  const referenceCall = (c as any).referenceCall as
    | {
        callId?: string;
        summary?: string;
        transcript?: string;
        recordingUrl?: string;
        verdict?: "PASS" | "FAIL" | "UNKNOWN";
        endedAt?: string;
      }
    | undefined;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <AutoRefresh intervalMs={3500} />
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link className="text-sm text-slate-700 hover:underline" href="/dashboard">
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold mt-2 text-slate-900">{c.fullName}</h1>
            <p className="text-sm text-slate-600">
              {c.roleApplied} • {c.email}
            </p>
          </div>

          {/* Human check */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm px-4 py-3">
            <div className="text-xs text-slate-500">Human check</div>
            <div
              className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                c.humanCheckNeeded
                  ? "bg-rose-50 text-rose-800 ring-rose-200"
                  : "bg-emerald-50 text-emerald-800 ring-emerald-200"
              }`}
            >
              {c.humanCheckNeeded ? "Yes" : "No"}
            </div>
            {c.humanCheckNeeded && c.humanCheckReasons?.length > 0 && (
              <div className="mt-2 text-xs text-slate-600">
                {c.humanCheckReasons.join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Stage */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
          <div className="font-medium text-slate-900">Stage</div>
          <StageStepper stage={c.stage} />
          <div className="text-xs text-slate-500">
            Created: {fmtUTC(c.createdAt)} • Last activity: {fmtUTC(c.lastActivityAt)}
          </div>
        </div>

        {/* Main content (single column now) */}
        <div className="space-y-4">
          {/* Reference call */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-medium text-slate-900">Reference call</div>
                <div className="mt-1 text-xs text-slate-500">
                  Status:{" "}
                  <span className="font-medium text-slate-700">{status ?? "—"}</span>
                  {referenceCall?.callId ? (
                    <>
                      {" "}
                      • Call ID:{" "}
                      <span className="font-mono">{referenceCall.callId}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div>
                {referenceCall?.verdict ? (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                      referenceCall.verdict === "PASS"
                        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                        : referenceCall.verdict === "FAIL"
                          ? "bg-rose-50 text-rose-800 ring-rose-200"
                          : "bg-slate-50 text-slate-700 ring-slate-200"
                    }`}
                  >
                    {referenceCall.verdict}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                    Pending
                  </span>
                )}
              </div>
            </div>

            {!referenceCall ? (
              <div className="mt-3 text-sm text-slate-500">
                No call results yet. This card will populate automatically when the webhook
                receives the end-of-call-report.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {referenceCall.summary ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600">Vapi summary</div>
                    <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
                      {referenceCall.summary}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Summary not available yet.</div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {referenceCall.recordingUrl ? (
                    <a
                      href={referenceCall.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      ▶ Recording
                    </a>
                  ) : null}

                  {referenceCall.endedAt ? (
                    <span className="text-xs text-slate-500">
                      Ended: {fmtUTC(referenceCall.endedAt)}
                    </span>
                  ) : null}
                </div>

                {referenceCall.transcript ? (
                  <details className="rounded-2xl border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                      Transcript
                    </summary>
                    <div className="mt-2 max-h-80 overflow-auto text-sm text-slate-700 whitespace-pre-wrap">
                      {referenceCall.transcript}
                    </div>
                  </details>
                ) : null}
              </div>
            )}
          </div>

          {/* Activity */}
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

          {/* Messages */}
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
      </div>
    </main>
  );
}
