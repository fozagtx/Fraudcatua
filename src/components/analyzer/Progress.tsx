"use client";

const STEPS = [
  "Uploading",
  "Transcribing (Speechmatics)",
  "Reading the call",
  "Checking claims on the web",
  "Verdict",
];

export function Progress({ step }: { step: number }) {
  return (
    <ol className="space-y-3">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`mono-label w-8 ${state === "todo" ? "text-muted" : ""}`}
            >
              {String(n).padStart(2, "0")}
            </span>
            <span
              className={`mono-label ${
                state === "current"
                  ? "text-ink"
                  : state === "done"
                    ? "text-ink"
                    : "text-muted"
              }`}
            >
              {label}
            </span>
            {state === "current" && (
              <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-coral" />
            )}
            {state === "done" && <span className="text-deep-green">✓</span>}
          </li>
        );
      })}
    </ol>
  );
}
