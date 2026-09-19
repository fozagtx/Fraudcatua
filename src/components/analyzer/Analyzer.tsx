"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult, TranscriptSegment } from "@/lib/types";
import { Uploader } from "./Uploader";
import { Progress } from "./Progress";
import { ResultView } from "./ResultView";

type Phase =
  | { kind: "idle" }
  | { kind: "busy"; step: number }
  | { kind: "done"; result: AnalysisResult; segments: TranscriptSegment[]; analysisId: string | null }
  | { kind: "error"; message: string };

export function Analyzer({
  demo,
}: {
  demo?: { result: AnalysisResult; segments: TranscriptSegment[] };
}) {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(
    demo ? { kind: "done", result: demo.result, segments: demo.segments, analysisId: null } : { kind: "idle" },
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const pickFile = (f: File) => {
    setFile(f);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(f));
  };

  const run = async () => {
    if (!file) return;
    setPhase({ kind: "busy", step: 1 });
    try {
      const form = new FormData();
      form.append("file", file);
      setPhase({ kind: "busy", step: 2 });
      const tRes = await fetch("/api/transcribe", { method: "POST", body: form });
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error ?? "Transcription failed");
      const segments: TranscriptSegment[] = tJson.segments;
      const durationS: number = tJson.durationS;

      setPhase({ kind: "busy", step: 3 });
      timerRef.current = setInterval(() => {
        setPhase((p) =>
          p.kind === "busy" && p.step < 4 ? { kind: "busy", step: p.step + 1 } : p,
        );
      }, 6000);
      const aRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments, fileName: file.name, durationS }),
      });
      const aJson = await aRes.json();
      if (timerRef.current) clearInterval(timerRef.current);
      if (!aRes.ok) throw new Error(aJson.error ?? "Analysis failed");
      setPhase({ kind: "busy", step: 5 });
      setPhase({
        kind: "done",
        result: aJson.result,
        segments,
        analysisId: aJson.id ?? null,
      });
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (phase.kind === "done") {
    return (
      <ResultView
        result={phase.result}
        segments={phase.segments}
        audioUrl={audioUrl}
        analysisId={phase.analysisId}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Uploader file={file} onFile={pickFile} disabled={phase.kind === "busy"} />
      {phase.kind === "busy" ? (
        <div className="mt-8 rounded-card border border-hairline p-6">
          <Progress step={phase.step} />
        </div>
      ) : (
        <button
          type="button"
          className="btn-pill btn-primary mt-6 w-full"
          disabled={!file}
          onClick={run}
        >
          Transcribe &amp; analyze
        </button>
      )}
      {phase.kind === "error" && (
        <p className="mt-4 rounded-card border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {phase.message}
        </p>
      )}
    </div>
  );
}
