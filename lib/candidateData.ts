import type { Candidate } from "@/types/candidate";
import { mockCandidates } from "@/lib/mockCandidates";

declare global {
  // ensures the store is shared across Next module instances in dev
  // eslint-disable-next-line no-var
  var __hrCandidates: Candidate[] | undefined;
}

// Single, shared in-memory store
const candidates: Candidate[] =
  globalThis.__hrCandidates ?? (globalThis.__hrCandidates = [...mockCandidates]);

function makeId() {
  // demo-friendly unique id
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function listCandidates(): Candidate[] {
  return candidates;
}

export function getCandidateById(id: string): Candidate | null {
  return candidates.find((c) => c.id === id) ?? null;
}

export function addCandidate(input: { fullName: string; email: string }): Candidate {
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
    referralContacted: "NOT_STARTED",
    referralResponses: "NOT_STARTED",
    backgroundCheck: "NOT_STARTED",
  },

  humanCheckNeeded: false,
  humanCheckReasons: [],

  status: "INTAKE",

  referenceCall: {
    verdict: "UNKNOWN",
  },

  activity: [
    { at: now, label: "Prospect added by employer" },
    { at: now, label: "Intake email queued" },
  ],
  messages: [
    {
      at: now,
      channel: "email",
      subject: "Request: reference details",
      status: "sent",
    },
  ],
};


  // mutate in place so everyone sees the same array instance
  candidates.unshift(newCandidate);
  return newCandidate;
}
