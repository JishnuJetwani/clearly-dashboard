import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY || "");

function makeToken(len = 28) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function makeId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { fullName, email, companyName } = body ?? {};

  const name = String(fullName || "").trim();
  const mail = String(email || "").trim().toLowerCase();
  const company = companyName ? String(companyName).trim() : undefined;

  if (!name) return NextResponse.json({ error: "Missing fullName" }, { status: 400 });
  if (!mail || !mail.includes("@"))
    return NextResponse.json({ error: "Missing/invalid email" }, { status: 400 });

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY or EMAIL_FROM in env" },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const referralToken = makeToken();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const referralLink = `${baseUrl}/referrals/${referralToken}`;

  const candidateDoc = {
    id: makeId(),
    fullName: name,
    email: mail,
    companyName: company,

    status: "AWAITING_REFERRALS",
    referralToken,

    createdAt: now,
    lastActivityAt: now,

    stage: "INTAKE",
    tasks: {
      intakeForm: "WAITING",
      employmentVerification: "NOT_STARTED",
      referralContacted: "NOT_STARTED",
      referralResponses: "NOT_STARTED",
      backgroundCheck: "NOT_STARTED",
    },
    risk: { score: 10, flags: [] },
    activity: [{ at: now, label: "Candidate added; referral request email sent" }],
    messages: [
      { at: now, channel: "email", subject: "Provide your referral’s info", status: "sent" },
    ],
  };

  const client = await clientPromise;
  const db = client.db();
  const candidates = db.collection<any>("candidates");

  await candidates.insertOne(candidateDoc);

  // Send email
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: [mail],
    subject: "Action required: provide your referral’s information",
    html: `
      <div style="font-family: ui-sans-serif, system-ui; line-height:1.5;">
        <p>Hi ${name},</p>
        <p>To continue your onboarding${company ? ` with <b>${company}</b>` : ""}, please provide your referral’s details (name, phone number, company).</p>
        <p><a href="${referralLink}">Click here to submit referral information</a></p>
        <p>If the link doesn’t work, paste this into your browser:</p>
        <p>${referralLink}</p>
        <p>Thanks!</p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, id: candidateDoc.id, referralLink });
}
