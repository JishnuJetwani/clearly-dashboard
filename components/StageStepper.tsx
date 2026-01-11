import type { Stage } from "@/types/candidate";

const ORDER: Stage[] = [
  "INTAKE",
  "REFERRAL_OUTREACH",
  "BACKGROUND_CHECK",
  "DECISION",
  "ONBOARDING_COMPLETE",
];


function label(stage: Stage) {
  return stage.replaceAll("_", " ");
}

export default function StageStepper({ stage }: { stage: Stage }) {
  const isFlagged = stage === "FLAGGED";
  const idx = ORDER.indexOf(stage);

  return (
    <div className="space-y-3">
      {isFlagged && (
        <div className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">
          Flagged
        </div>
      )}

      <div className="relative rounded-2xl border border-slate-200 bg-white p-4">
        {/* track */}
        <div className="absolute left-6 right-6 top-7 h-px bg-slate-200" />
        {!isFlagged && idx >= 0 && (
          <div
            className="absolute left-6 top-7 h-px bg-slate-900"
            style={{
              width:
                ORDER.length <= 1
                  ? "0%"
                  : `calc(${(idx / (ORDER.length - 1)) * 100}% - 0px)`,
            }}
          />
        )}

        <ol className="relative flex items-start justify-between gap-2">
          {ORDER.map((s, i) => {
            const done = !isFlagged && idx >= 0 && i < idx;
            const active = !isFlagged && idx >= 0 && i === idx;

            const circle = isFlagged
              ? "bg-white ring-slate-200 text-slate-400"
              : done
                ? "bg-slate-900 ring-slate-900 text-white"
                : active
                  ? "bg-white ring-slate-900 text-slate-900"
                  : "bg-white ring-slate-200 text-slate-400";

            return (
              <li key={s} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={[
                    "h-8 w-8 rounded-full grid place-items-center text-xs font-semibold ring-2 ring-inset",
                    circle,
                  ].join(" ")}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div
                  className={[
                    "text-[11px] font-medium text-center leading-tight max-w-[110px]",
                    isFlagged
                      ? "text-slate-500"
                      : done || active
                        ? "text-slate-900"
                        : "text-slate-500",
                  ].join(" ")}
                >
                  {label(s)}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
