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
    return NextResponse.json(
      { error: "Referral phone is required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();
  const candidates = db.collection<any>("candidates");

  const candidate = await candidates.findOne({ referralToken: token });
  if (!candidate) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  // 1) Store referral info + advance status
await candidates.updateOne(
  { referralToken: token },
  {
    $set: {
      referral: { name: refName || "", phone: refPhone, email: refEmail || "" },
      status: "REFERRALS_SUBMITTED",
      lastActivityAt: now,
    },
    $push: ({
      activity: { $each: [{ at: now, label: "Referral info submitted" }] },
    } as any),
  }
);

  // 2) Trigger Vapi call by calling your existing Next route
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const callRes = await fetch(`${baseUrl}/api/vapi/start-reference-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidateName: candidate.fullName,
      companyName: candidate.companyName || "Company",
      referencePhone: refPhone,
    }),
  });

  if (!callRes.ok) {
    const data = await callRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: "Failed to start call", details: data },
      { status: 500 }
    );
  }

  const data = await callRes.json().catch(() => ({}));
  const callId = data?.callId;

  if (!callId) {
    return NextResponse.json(
      { error: "Vapi did not return a callId", raw: data },
      { status: 500 }
    );
  }

  // 3) Store callId + advance status
await candidates.updateOne(
  { referralToken: token },
  {
    $set: {
      status: "CALL_IN_PROGRESS",
      "vapi.callId": callId,
      lastActivityAt: now,
    },
    $push: ({
      activity: { $each: [{ at: now, label: `Reference call started (callId: ${callId})` }] },
    } as any),
  }
);


  return NextResponse.json({ success: true, callId });
}
