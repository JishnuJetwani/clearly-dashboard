import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ai = new GoogleGenAI({}); // uses process.env.GEMINI_API_KEY automatically

type GeminiAnalysis = {
  summaryBullets: string[];
  verdict: "positive" | "negative" | "unclear";
  confidence: number; // 0..1
  redFlags: string[];
};

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {}
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {}
  }
  return null;
}

async function analyzeTranscriptWithGemini(transcript: string): Promise<GeminiAnalysis | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = `
Return ONLY valid JSON with this exact shape:
{
  "summaryBullets": ["...", "...", "..."],
  "verdict": "positive" | "negative" | "unclear",
  "confidence": 0.0-1.0,
  "redFlags": ["...", "..."]
}

Rules:
- summaryBullets: 3-6 concise bullets.
- verdict: "positive" if reference is supportive / confirms employment / no serious concerns.
- verdict: "negative" if serious concerns or contradicts key claims.
- verdict: "unclear" if insufficient info.
- confidence is your best estimate.

Transcript:
${transcript}
`.trim();

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = (resp as any)?.text?.trim?.() ?? "";
  const parsed = safeJsonParse(text);
  if (!parsed) return null;

  const verdict = parsed.verdict;
  if (!["positive", "negative", "unclear"].includes(verdict)) return null;

  return {
    summaryBullets: Array.isArray(parsed.summaryBullets) ? parsed.summaryBullets : [],
    verdict,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
  };
}

function pickCallId(msg: any) {
  return msg?.call?.id ?? msg?.callId ?? msg?.call?.callId ?? msg?.id ?? null;
}

function pickCandidateId(msg: any) {
  // Where Vapi variables usually show up on end-of-call-report
  return (
    msg?.artifact?.variableValues?.candidate_id ||
    msg?.variableValues?.candidate_id ||
    msg?.call?.assistantOverrides?.variableValues?.candidate_id ||
    null
  );
}

function pickSummary(msg: any) {
  return msg?.summary ?? msg?.analysis?.summary ?? msg?.artifact?.summary ?? null;
}

function pickTranscript(msg: any) {
  return (
    msg?.transcript ||
    msg?.artifact?.transcript ||
    null
  );
}

function pickRecordingUrl(msg: any) {
  return (
    msg?.recordingUrl ||
    msg?.artifact?.recordingUrl ||
    msg?.artifact?.recording?.mono?.combinedUrl ||
    msg?.artifact?.recording?.mono?.combined ||
    null
  );
}

function safeObjectId(id: string | null) {
  if (!id) return null;
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

export async function POST(req: Request) {
  // Optional auth if you set WEBHOOK_TOKEN in env + configure Vapi header x-webhook-token
  const expected = process.env.WEBHOOK_TOKEN;
  if (expected) {
    const got = req.headers.get("x-webhook-token");
    if (got !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  const msg = body?.message;

  if (!msg?.type) return NextResponse.json({ ok: true });

  // We only care about end-of-call-report (contains built-in summary + transcript + recording URLs)
  if (msg.type !== "end-of-call-report") {
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();

  const callId = pickCallId(msg);
  const candidateIdRaw = pickCandidateId(msg);
  const candidateObjectId = safeObjectId(candidateIdRaw);

  const transcript = pickTranscript(msg) ?? "";
  const summary = pickSummary(msg) ?? "";
  const recordingUrl = pickRecordingUrl(msg);
  const endedReason: string = msg?.endedReason ?? "unknown";

  if (!callId) {
    return NextResponse.json({ ok: true, ignored: true, reason: "missing callId" });
  }

  const client = await clientPromise;
  const db = process.env.MONGODB_DB ? client.db(process.env.MONGODB_DB) : client.db();
  const candidates = db.collection("candidates");

  // ✅ Match candidate:
  // 1) Prefer candidate_id from Vapi variables (best)
  // 2) Fallback to stored callId on candidate (if you still rely on that)
  const match =
    candidateObjectId
      ? { _id: candidateObjectId }
      : { $or: [{ "vapi.callId": callId }, { "referenceCall.callId": callId }] };

  // Always store Vapi built-ins on the candidate doc
  await candidates.updateOne(
    match,
    ({
      $set: {
        updatedAt: now,
        lastActivityAt: now,

        // Keep your newer vapi.* namespace (recommended)
        "vapi.callId": callId,
        "vapi.endedReason": endedReason,
        "vapi.summary": summary || null,
        "vapi.transcript": transcript || null,
        "vapi.recordingUrl": recordingUrl || null,

        // Back-compat if any UI is reading referenceCall.*
        "referenceCall.callId": callId,
        "referenceCall.status": "ended",
        "referenceCall.endedReason": endedReason,
        "referenceCall.summary": summary || null,
        "referenceCall.transcript": transcript || null,
        "referenceCall.recordingUrl": recordingUrl || null,

        // Stage tracking
        status: "REF_CALL_DONE",
      },
      $push: {
        activity: {
          at: now,
          label: `Reference call completed (${endedReason})`,
        },
      },
    } as any)
  );

  // Optional: run Gemini to decide PASS/FAIL/REVIEW (keeps your automation)
  const textForModel = (transcript || summary || "").trim();
  if (textForModel.length > 0) {
    const analysis = await analyzeTranscriptWithGemini(transcript || summary);

    if (analysis) {
      const nextStatus =
        analysis.verdict === "positive"
          ? "REF_CALL_PASSED"
          : analysis.verdict === "negative"
          ? "REF_CALL_FAILED"
          : "REF_CALL_NEEDS_REVIEW";

      await candidates.updateOne(
        match,
        ({
          $set: {
            updatedAt: now,
            lastActivityAt: now,
            "vapi.analysis": analysis,
            "vapi.analyzedAt": now,
            status: nextStatus,
          },
          $push: {
            activity: {
              at: now,
              label: `Gemini verdict: ${analysis.verdict} (${Math.round(
                analysis.confidence * 100
              )}%)`,
            },
          },
        } as any)
      );
    }
  }

  return NextResponse.json({ ok: true });
}
