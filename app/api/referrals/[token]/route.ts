import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const body = await req.json().catch(() => null);
  const { refName, refPhone, refEmail } = body ?? {};

  if (!refPhone) {
    return NextResponse.json({ error: "Referral phone is required" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();
  const candidates = db.collection<any>("candidates");

  const candidate = await candidates.findOne({ referralToken: token });
  if (!candidate) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const candidateId = String(candidate._id);
  const now = new Date().toISOString();

  // 1) Save referral info + advance stage/tasks
  await candidates.updateOne(
    { referralToken: token },
    {
      $set: {
        referral: { name: refName || "", phone: refPhone, email: refEmail || "" },
        status: "INTAKE_COMPLETED",
        stage: "REFERRAL_OUTREACH",
        "tasks.intakeForm": "DONE",
        "tasks.referralContacted": "WAITING",
        "tasks.referralResponses": "NOT_STARTED",
        lastActivityAt: now,
      },
      $push: { activity: { $each: [{ at: now, label: "Referral info submitted" }] } } as any,
    }
  );

  // 2) Trigger Vapi call
  const origin = new URL(req.url).origin;

  const callRes = await fetch(`${origin}/api/vapi/start-reference-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidateId, // critical: goes into Vapi variableValues.candidate_id
      candidateName: candidate.fullName,
      companyName: candidate.companyName || "Company",
      referencePhone: refPhone,
      referenceName: refName || "",
      referenceEmail: refEmail || "",
    }),
  });

  if (!callRes.ok) {
    const data = await callRes.json().catch(() => ({}));
    return NextResponse.json({ error: "Failed to start call", details: data }, { status: 500 });
  }

  const data = await callRes.json().catch(() => ({}));
  const callId = data?.callId;

  if (!callId) {
    return NextResponse.json({ error: "Vapi did not return a callId", raw: data }, { status: 500 });
  }

  // 3) Store callId + advance status/tasks
  await candidates.updateOne(
    { referralToken: token },
    {
      $set: {
        status: "REF_CALL_IN_PROGRESS",
        stage: "REFERRAL_OUTREACH",
        "vapi.callId": callId,
        "vapi.referencePhone": refPhone,
        "tasks.referralContacted": "DONE",
        "tasks.referralResponses": "WAITING",
        lastActivityAt: now,
      },
      $push: {
        activity: { $each: [{ at: now, label: `Reference call started (callId: ${callId})` }] },
      } as any,
    }
  );

  return NextResponse.json({ success: true, callId });
}
