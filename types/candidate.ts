export type TaskStatus = "NOT_STARTED" | "WAITING" | "DONE" | "FAILED";

export type Stage =
  | "INTAKE"
  | "REFERRAL_OUTREACH"
  | "BACKGROUND_CHECK"
  | "DECISION"
  | "ONBOARDING_COMPLETE"
  | "FLAGGED";

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  roleApplied: string;

  stage: Stage;
  status: string;

  tasks: {
    intakeForm: TaskStatus;
    referralContacted: TaskStatus;
    referralResponses: TaskStatus;
    backgroundCheck: TaskStatus;
  };

  humanCheckNeeded: boolean;
  humanCheckReasons: string[];

  createdAt: string;
  lastActivityAt: string;

  activity?: { at: string; label: string }[];
  messages?: {
    at: string;
    channel: "email" | "sms";
    subject: string;
    status: "sent" | "delivered" | "failed";
  }[];

  referenceCall?: {
    callId?: string;
    summary?: string;
    transcript?: string;
    recordingUrl?: string;
    verdict?: "PASS" | "FAIL" | "UNKNOWN";
    endedAt?: string;
  };
};
