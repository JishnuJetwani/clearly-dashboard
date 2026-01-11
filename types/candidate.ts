// types/candidate.ts

export type Stage =
  | "INTAKE"
  | "EMPLOYMENT_VERIFY"
  | "REFERRAL_OUTREACH"
  | "BACKGROUND_CHECK"
  | "DECISION"
  | "ONBOARDING_COMPLETE"
  | "FLAGGED";

export type TaskStatus = "NOT_STARTED" | "WAITING" | "DONE" | "FAILED";

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  roleApplied: string;
  activity: ActivityItem[];
  messages: MessageItem[];

  createdAt: string; // ISO date string
  lastActivityAt: string; // ISO date string

  stage: Stage;

  tasks: {
    intakeForm: TaskStatus;
    employmentVerification: TaskStatus;
    referralContacted: TaskStatus;
    referralResponses: TaskStatus;
    backgroundCheck: TaskStatus;
  };

  risk: {
    score: number; // 0-100
    flags: string[];
  };
};
export type ActivityItem = {
  at: string; // ISO
  label: string;
};

export type MessageItem = {
  at: string; // ISO
  channel: "email" | "sms";
  subject: string;
  status: "sent" | "delivered" | "failed";
};

