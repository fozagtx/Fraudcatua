"use client";

import { useEffect, useRef } from "react";
import type { TranscriptSegment } from "@/lib/types";
import { fmtTime } from "./format";

const SPEAKER_COLORS = ["bg-deep-green", "bg-coral", "bg-blue", "bg-[#8a5a00]"];

export function Transcript({
  segments,
  activeId,
  evidenceIds,
  flashId,
  onSeek,
}: {
  segments: TranscriptSegment[];
  activeId: number | null;
  evidenceIds: Set<number>;
  flashId: number | null;
  onSeek: (t: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const speakerColor = new Map<string, string>();
  for (const s of segments) {
    if (!speakerColor.has(s.speaker)) {
      speakerColor.set(s.speaker, SPEAKER_COLORS[speakerColor.size % SPEAKER_COLORS.length]);
    }
  }

  useEffect(() => {
    if (activeId == null) return;
    const el = containerRef.current?.querySelector(`[data-seg="${activeId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <div className="rounded-card border border-hairline">
      <div className="border-b border-hairline px-5 py-3">
        <span className="mono-label text-muted">Transcript</span>
      </div>
      <div ref={containerRef} className="max-h-[480px] overflow-y-auto p-5">
        <div className="space-y-4">
          {segments.map((s) => {
            const isEvidence = evidenceIds.has(s.id);
            const isActive = s.id === activeId;
            const isFlash = s.id === flashId;
            return (
              <button
                key={s.id}
                data-seg={s.id}
                type="button"
                onClick={() => onSeek(s.start)}
                className={`block w-full text-left transition-colors ${
                  isEvidence ? "border-l-2 border-coral pl-3" : "pl-3 border-l-2 border-transparent"
                } ${isActive ? "bg-stone rounded-card" : ""} ${isFlash ? "flash rounded-card" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${speakerColor.get(s.speaker)}`}
                  />
                  <span className="mono-label">{s.speaker}</span>
                  <span className="mono-label tabular text-muted">
                    {fmtTime(s.start)}
                  </span>
                  {isEvidence && (
                    <span className="mono-label text-coral">evidence</span>
                  )}
                </span>
                <span className="mt-1 block text-sm leading-relaxed">{s.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
