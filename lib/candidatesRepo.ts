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

    // safety: if an older doc doesn't have id, generate one and persist it
    if (!c.id) {
      c.id = makeId();
    }
    return c as Candidate;
  });
}

export async function getCandidateByIdDb(id: string): Promise<Candidate | null> {
  const client = await clientPromise;
  const db = client.db();

  const row = await db.collection("candidates").findOne({ id });
  if (!row) return null;

  return toPlain<Candidate>(row);
}

export async function addCandidateDb(input: {
  fullName: string;
  email: string;
}): Promise<Candidate> {
  const now = new Date().toISOString();

  const newCandidate: Candidate = {
    id: makeId(),
    fullName: input.fullName,
    email: input.email,
    roleApplied: "Prospect",
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
  await db.collection("candidates").insertOne(newCandidate as any);

  return newCandidate;
}
