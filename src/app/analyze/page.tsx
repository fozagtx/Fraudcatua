"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Analyzer } from "@/components/analyzer/Analyzer";
import { SAMPLE_RESULT, SAMPLE_SEGMENTS } from "@/lib/sample";

export default function AnalyzePage() {
  return (
    <Suspense>
      <AnalyzeInner />
    </Suspense>
  );
}

function AnalyzeInner() {
  const params = useSearchParams();
  const demo =
    params.get("demo") === "1" && process.env.NODE_ENV !== "production"
      ? { result: SAMPLE_RESULT, segments: SAMPLE_SEGMENTS }
      : undefined;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <span className="mono-label text-muted">Analyze a call</span>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Upload the recording.
      </h1>
      <p className="mt-3 max-w-xl text-ink/70">
        We transcribe it, check the caller&apos;s claims, and show you the evidence
        with timestamps.
      </p>
      <div className="mt-10">
        <Analyzer demo={demo} />
      </div>
    </div>
  );
}
