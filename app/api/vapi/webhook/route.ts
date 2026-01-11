import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------
 * Payload extraction helpers
 * ----------------------------- */
function pickCallId(payload: any) {
  return (
    payload?.callId ||
    payload?.call?.id ||
    payload?.id ||
    payload?.message?.call?.id ||
    payload?.message?.callId ||
    payload?.message?.id ||
    null
  );
}

function pickEventType(payload: any) {
  return (
    payload?.message?.type ||
    payload?.type ||
    payload?.event ||
    payload?.name ||
    payload?.status ||
    "unknown"
  );
}

function pickSummary(payload: any) {
  return payload?.message?.analysis?.summary ?? payload?.message?.summary ?? null;
}

function pickTranscript(payload: any) {
  return payload?.message?.artifact?.transcript ?? payload?.message?.transcript ?? null;
}

function pickRecordingUrl(payload: any) {
  return (
    payload?.message?.recordingUrl ||
    payload?.message?.artifact?.recordingUrl ||
    payload?.message?.artifact?.recording?.mono?.combinedUrl ||
    null
  );
}

function pickVars(payload: any) {
  return (
    payload?.message?.artifact?.variableValues ||
    payload?.message?.variableValues ||
    payload?.message?.call?.assistantOverrides?.variableValues ||
    {}
  );
}

// This is Vapi’s “agent succeeded at objective” metric — we store it for debugging only.
function pickVapiSuccessEvaluation(payload: any) {
  return (
    payload?.message?.analysis?.successEvaluation ??
    payload?.analysis?.successEvaluation ??
    payload?.message?.successEvaluation ??
    payload?.successEvaluation ??
    null
  );
}

/* -----------------------------
 * “Did the reference pick up?” heuristic
 * ----------------------------- */
function computeCallIncomplete(args: { endedReason: any; transcript: any }) {
  const endedReason = String(args.endedReason ?? "").toLowerCase();
  const transcriptLen = String(args.transcript ?? "").trim().length;

  const looksNoAnswer =
    endedReason.includes("no_answer") ||
    endedReason.includes("no-answer") ||
    endedReason.includes("did_not_answer") ||
    endedReason.includes("did-not-answer") ||
    endedReason.includes("voicemail") ||
    endedReason.includes("busy") ||
    endedReason.includes("timeout") ||
    endedReason.includes("failed");

  // If transcript is basically empty, treat as incomplete
  const transcriptTooShort = transcriptLen < 40;

  return looksNoAnswer || transcriptTooShort;
}

/* -----------------------------
 * Gemini PASS/FAIL (reference sentiment)
 * - Output MUST be exactly one word: pass or fail
 * ----------------------------- */
async function geminiPassFail(input: { summary: string; transcript?: string | null }) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!key) {
    // Without Gemini, safest triage is "needs human check"
    return { verdict: "FAIL" as const, source: "missing_key" as const, raw: "" };
  }

  const prompt =
    `You are evaluating a job reference call.\n` +
    `Decide whether the REFERENCE FEEDBACK about the candidate is positive enough to PASS or negative enough to FAIL.\n` +
    `PASS if the reference clearly recommends the candidate / is positive / no significant concerns.\n` +
    `FAIL if the reference is negative, refuses to recommend, expresses serious concerns, or cannot confirm key claims.\n` +
    `Output exactly one word: pass or fail. No punctuation. No extra words.\n\n` +
    `SUMMARY:\n${input.summary}\n` +
    (input.transcript ? `\nTRANSCRIPT:\n${input.transcript}\n` : "");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 5,
        },
      }),
    });

    const json = await resp.json().catch(() => ({} as any));

    const text: string =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("") ?? "";

    const cleaned = text.trim().toLowerCase();

    if (cleaned === "pass") return { verdict: "PASS" as const, source: "gemini" as const, raw: text };
    if (cleaned === "fail") return { verdict: "FAIL" as const, source: "gemini" as const, raw: text };

    // If Gemini returns anything unexpected, default to FAIL -> triggers human check.
    return { verdict: "FAIL" as const, source: "gemini_invalid" as const, raw: text };
  } catch (e: any) {
    return { verdict: "FAIL" as const, source: "gemini_error" as const, raw: String(e?.message ?? e) };
  }
}

export async function POST(req: Request) {
  // Optional simple auth (recommended)
  const expected = process.env.WEBHOOK_TOKEN;
  if (expected) {
    const got = req.headers.get("x-webhook-token");
    if (got !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = await req.json().catch(() => ({}));

  const callId = pickCallId(payload);
  const eventType = pickEventType(payload);
  const summary = pickSummary(payload);
  const transcript = pickTranscript(payload);
  const recordingUrl = pickRecordingUrl(payload);
  const vars = pickVars(payload);
  const vapiSuccessEvaluation = pickVapiSuccessEvaluation(payload);

  const endedReason = payload?.message?.endedReason ?? null;
  const startedAt = payload?.message?.startedAt ?? null;
  const endedAt = payload?.message?.endedAt ?? null;
  const durationSeconds = payload?.message?.durationSeconds ?? null;

  const conversation =
    payload?.message?.conversation ??
    payload?.conversation ??
    payload?.message?.messagesOpenAIFormatted ??
    null;

  const messages = payload?.message?.messages ?? payload?.messages ?? null;

  const client = await clientPromise;
  const db = client.db();

  const now = new Date().toISOString();

  // 1) Store raw event (debug + audit)
  await db.collection("vapi_events").insertOne({
    callId,
    eventType,
    receivedAt: now,
    conversation,
    messages,
    payload,
  });

  // 2) If end-of-call-report, upsert vapi_calls AND update matching candidate
  if (eventType === "end-of-call-report" && callId) {
    const callIncomplete = computeCallIncomplete({ endedReason, transcript });

    // Gemini verdict based on sentiment (only meaningful if call actually connected)
    const verdictResult =
      callIncomplete || !summary
        ? { verdict: "FAIL" as const, source: callIncomplete ? "incomplete_call" : "missing_summary", raw: "" }
        : await geminiPassFail({ summary, transcript });

    const verdict = verdictResult.verdict; // PASS / FAIL

    // Human check rules you requested:
    // Yes if (negative recommendation) OR (didn't pick up / incomplete call)
    const humanCheckNeeded = verdict === "FAIL" || callIncomplete;

    const humanCheckReasons: string[] = [];
    if (callIncomplete) humanCheckReasons.push("Reference did not answer / call incomplete");
    if (!callIncomplete && verdict === "FAIL") humanCheckReasons.push("Negative reference");

    // 2a) Clean call summary store
    await db.collection("vapi_calls").updateOne(
      { callId },
      {
        $set: {
          callId,
          updatedAt: now,

          summary,
          transcript,
          recordingUrl,

          // Verdict from Gemini (sentiment)
          verdict,
          verdictSource: verdictResult.source,
          verdictRaw: verdictResult.raw,

          // Keep Vapi’s metric separately for debugging
          vapiSuccessEvaluation,

          endedReason,
          startedAt,
          endedAt,
          durationSeconds,

          candidate_name: vars?.candidate_name ?? null,
          company_name: vars?.company_name ?? null,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    // 2b) Candidate update (glue for the dashboard)
    const candidates = db.collection("candidates");

    const candidateIdRaw = typeof vars?.candidate_id === "string" ? vars.candidate_id : null;

    // Stage/tasks/status transitions:
    // - If incomplete (no pickup): keep in REFERRAL_OUTREACH, referralResponses stays WAITING
    // - If completed: move to DECISION, referralResponses DONE
    const nextStage = callIncomplete ? "REFERRAL_OUTREACH" : "DECISION";
    const nextStatus = callIncomplete
      ? "REF_CALL_NO_ANSWER"
      : verdict === "PASS"
        ? "REF_CALL_PASSED"
        : "REF_CALL_FAILED";

    const referralResponsesTask = callIncomplete ? "WAITING" : "DONE";

    const updateDoc: any = {
      $set: {
        referenceCall: {
          callId,
          summary,
          transcript,
          recordingUrl,
          verdict,
          verdictSource: verdictResult.source,
          verdictRaw: verdictResult.raw,
          vapiSuccessEvaluation,
          endedReason,
          startedAt,
          endedAt,
          durationSeconds,
        },
        status: nextStatus,
        stage: nextStage,

        // ✅ replaces vague “risk”
        humanCheckNeeded,
        humanCheckReasons,

        // checklist updates
        "tasks.referralContacted": "DONE",
        "tasks.referralResponses": referralResponsesTask,

        lastActivityAt: now,
      },
      $push: {
        activity: {
          at: now,
          label: callIncomplete
            ? "Reference call ended (no answer — needs follow-up)"
            : verdict === "PASS"
              ? "Reference call ended (PASS)"
              : "Reference call ended (FAIL)",
        },
      },
    };

    let matched = 0;

    // Prefer candidate_id (Mongo _id) if available
    if (candidateIdRaw && ObjectId.isValid(candidateIdRaw)) {
      const res = await candidates.updateOne({ _id: new ObjectId(candidateIdRaw) }, updateDoc);
      matched = res.matchedCount;
    }

    // Fallback: match by vapi.callId stored on candidate
    if (matched === 0) {
      await candidates.updateOne({ "vapi.callId": callId }, updateDoc);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/vapi/webhook" });
}
