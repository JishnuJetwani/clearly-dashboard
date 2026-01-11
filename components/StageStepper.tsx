import type { Stage } from "@/types/candidate";

const ORDER: Stage[] = [
  "INTAKE",
  "EMPLOYMENT_VERIFY",
  "REFERRAL_OUTREACH",
  "BACKGROUND_CHECK",
  "DECISION",
  "ONBOARDING_COMPLETE",
];

function label(stage: Stage) {
  return stage.replaceAll("_", " ");
}

export default function StageStepper({ stage }: { stage: Stage }) {
  const idx = ORDER.indexOf(stage);

  // If stage is FLAGGED, show as all gray + flagged badge
  const isFlagged = stage === "FLAGGED";

  return (
    <div className="space-y-2">
      {isFlagged && (
        <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
          FLAGGED
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {ORDER.map((s, i) => {
          const active = !isFlagged && i <= idx;
          return (
            <div
              key={s}
              className={[
                "rounded-full px-3 py-1 text-xs border",
                active
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-600 border-gray-200",
              ].join(" ")}
            >
              {label(s)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
