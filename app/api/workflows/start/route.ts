import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function makeToken(len = 28) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function makeId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function getBaseUrl() {
  // 1) Explicit app URL (best)
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/+$/, "");

  // 2) Vercel provided URL (auto)
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  // 3) Local dev fallback
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { fullName, email, companyName } = body ?? {};

  const name = String(fullName || "").trim();
  const mail = String(email || "").trim().toLowerCase();
  const company = companyName ? String(companyName).trim() : undefined;

  if (!name) return NextResponse.json({ error: "Missing fullName" }, { status: 400 });
  if (!mail || !mail.includes("@")) {
    return NextResponse.json({ error: "Missing/invalid email" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();

  if (!resendKey || !emailFrom) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY or EMAIL_FROM in env" },
      { status: 500 }
    );
  }

  const resend = new Resend(resendKey);

  const now = new Date().toISOString();
  const referralToken = makeToken();

  const baseUrl = getBaseUrl();
  const referralLink = `${baseUrl}/referrals/${encodeURIComponent(referralToken)}`;

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
      referralContacted: "NOT_STARTED",
      referralResponses: "NOT_STARTED",
      backgroundCheck: "NOT_STARTED",
    },
    humanCheckNeeded: false,
    humanCheckReasons: [],
    activity: [{ at: now, label: "Candidate added; referral request email sent" }],
    messages: [{ at: now, channel: "email", subject: "Provide your referral’s info", status: "sent" }],
  };

  const client = await clientPromise;
  const db = client.db();
  const candidates = db.collection<any>("candidates");

  await candidates.insertOne(candidateDoc);

  await resend.emails.send({
    from: emailFrom,
    to: [mail],
    subject: "Action required: provide your referral’s information",
    html: `
      <div style="font-family: ui-sans-serif, system-ui; line-height:1.5;">
        <p>Hi ${name},</p>
        <p>To continue your onboarding${company ? ` with <b>${company}</b>` : ""}, please provide your referral’s details (name, phone number, company).</p>
        <p><a href="${referralLink}">Click here to submit referral information</a></p>
        <p style="margin-top:12px; color:#6b7280; font-size:12px;">
          If the link doesn’t work, paste this into your browser:<br/>
          ${referralLink}
        </p>
        <p>Thanks!</p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, id: candidateDoc.id, referralLink });
}
