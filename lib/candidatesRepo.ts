import clientPromise from "./mongodb";
import type { Candidate } from "../types/candidate";

function makeId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function toPlain<T extends Record<string, any>>(doc: any): T {
  // Convert ObjectId/Date/etc into JSON-safe values
  const plain = JSON.parse(JSON.stringify(doc));
  delete plain._id; // remove Mongo internal id so Next can pass this to client components
  return plain as T;
}

function withDefaults(raw: any): Candidate {
  const c = raw as Candidate;

  // Back-compat defaults so UI never breaks on older docs
  (c as any).roleApplied = c.roleApplied ?? "Prospect";
  (c as any).stage = c.stage ?? "INTAKE";
  (c as any).status = (c as any).status ?? "NEW";

  // ✅ New replacement for risk (back-compat)
  (c as any).humanCheckNeeded = (c as any).humanCheckNeeded ?? false;
  (c as any).humanCheckReasons = (c as any).humanCheckReasons ?? [];

  // Tasks default (in case older docs are missing any keys)
  (c as any).tasks = c.tasks ?? {
    intakeForm: "NOT_STARTED",
    employmentVerification: "NOT_STARTED",
    referralContacted: "NOT_STARTED",
    referralResponses: "NOT_STARTED",
    backgroundCheck: "NOT_STARTED",
  };

  (c as any).activity = (c as any).activity ?? [];
  (c as any).messages = (c as any).messages ?? [];

  // If old docs still have risk, ignore it (we’re not using it anymore)
  if ((c as any).risk) delete (c as any).risk;

  return c;
}

export async function listCandidatesDb(): Promise<Candidate[]> {
  const client = await clientPromise;
  const db = client.db();

  const rows = await db
    .collection("candidates")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return rows.map((r) => {
    const c = toPlain<Candidate & { id?: string }>(r);

    // safety: if an older doc doesn't have id, generate one (UI uses /candidates/[id])
    if (!c.id) {
      c.id = makeId();
      // NOTE: we do NOT persist this here (no _id available after toPlain delete)
      // If you want persistence, do it in a migration script.
    }

    return withDefaults(c);
  });
}

export async function getCandidateByIdDb(id: string): Promise<Candidate | null> {
  const client = await clientPromise;
  const db = client.db();

  const row = await db.collection("candidates").findOne({ id });
  if (!row) return null;

  const c = toPlain<Candidate>(row);
  return withDefaults(c);
}

export async function addCandidateDb(input: {
  fullName: string;
  email: string;
}): Promise<Candidate> {
  const now = new Date().toISOString();

  const newCandidate: any = {
    id: makeId(),
    fullName: input.fullName,
    email: input.email,
    roleApplied: "Prospect",
    createdAt: now,
    lastActivityAt: now,

    stage: "INTAKE",
    status: "NEW",

    tasks: {
  intakeForm: "WAITING",
  referralContacted: "NOT_STARTED",
  referralResponses: "NOT_STARTED",
  backgroundCheck: "NOT_STARTED",
},

    // ✅ new field replacing risk
    humanCheckNeeded: false,
    humanCheckReasons: [],

    activity: [
      { at: now, label: "Prospect added by employer" },
      { at: now, label: "Intake email queued" },
    ],
    messages: [
      { at: now, channel: "email", subject: "Request: reference details", status: "sent" },
    ],
  };

  const client = await clientPromise;
  const db = client.db();
  await db.collection("candidates").insertOne(newCandidate);

  return withDefaults(newCandidate);
}
