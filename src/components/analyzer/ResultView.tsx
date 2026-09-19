"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalysisResult, TranscriptSegment } from "@/lib/types";
import { AudioPlayer, type AudioPlayerHandle } from "./AudioPlayer";
import { Transcript } from "./Transcript";
import { fmtTime } from "./format";

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-coral",
  medium: "bg-coral-soft",
  low: "bg-muted",
};

const STATUS_STYLE: Record<string, string> = {
  false: "bg-coral text-white",
  unverified: "bg-stone text-muted",
  true: "bg-deep-green text-white",
};

export function ResultView({
  result,
  segments,
  audioUrl,
  analysisId,
}: {
  result: AnalysisResult;
  segments: TranscriptSegment[];
  audioUrl: string | null;
  analysisId: string | null;
}) {
  const router = useRouter();
  const playerRef = useRef<AudioPlayerHandle>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const evidenceIds = useMemo(() => {
    const set = new Set<number>();
    for (const e of result.evidence) e.segmentIds.forEach((id) => set.add(id));
    return set;
  }, [result]);

  const segById = useMemo(
    () => new Map(segments.map((s) => [s.id, s])),
    [segments],
  );

  const playEvidence = (ids: number[]) => {
    const first = segById.get(ids[0]);
    const last = segById.get(ids[ids.length - 1]);
    if (audioUrl && first && last) {
      playerRef.current?.playRange(first.start, last.end);
    }
    if (first) {
      setFlashId(first.id);
      document
        .querySelector(`[data-seg="${first.id}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(() => setFlashId(null), 1700);
    }
  };

  const reportHref = (() => {
    const p = new URLSearchParams();
    if (result.numbersMentioned[0]) p.set("number", result.numbersMentioned[0]);
    if (result.impersonatedService) p.set("service", result.impersonatedService);
    if (result.scamType !== "none") p.set("scamType", result.scamType);
    if (analysisId) p.set("analysisId", analysisId);
    return `/report?${p.toString()}`;
  })();

  const bandClass =
    result.verdict === "scam"
      ? "bg-primary text-white"
      : result.verdict === "suspicious"
        ? "bg-stone text-ink"
        : "bg-deep-green text-white";
  const verdictWord =
    result.verdict === "scam"
      ? "Scam"
      : result.verdict === "suspicious"
        ? "Suspicious"
        : "Likely legit";

  return (
    <div>
      <section className={`rounded-band mx-4 px-8 py-12 sm:px-14 ${bandClass}`}>
        <span
          className={`mono-label ${result.verdict === "suspicious" ? "text-muted" : "text-white/60"}`}
        >
          Verdict
        </span>
        <h1 className="mt-3 font-display text-6xl tracking-tight sm:text-8xl">
          {verdictWord}
        </h1>
        <p
          className={`mono-label mt-4 tabular ${result.verdict === "suspicious" ? "text-muted" : "text-white/60"}`}
        >
          {Math.round(result.confidence)}% confidence
        </p>
        <p className="mt-6 max-w-2xl font-display text-2xl leading-snug">
          {result.headline}
        </p>
        <p
          className={`mt-3 max-w-2xl ${result.verdict === "suspicious" ? "text-ink/70" : "text-white/80"}`}
        >
          {result.explanation}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span
            className={`mono-label rounded-pill px-4 py-2 ${
              result.verdict === "scam"
                ? "bg-coral text-white"
                : "bg-white/10 text-current border border-hairline"
            }`}
          >
            {result.scamType.replaceAll("_", " ")}
          </span>
          {result.impersonatedService && (
            <span className="mono-label rounded-pill border border-hairline px-4 py-2">
              {result.impersonatedService}
            </span>
          )}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className={`btn-pill ${
              result.verdict === "suspicious" ? "btn-primary" : "bg-white text-ink hover:bg-white/90"
            }`}
            onClick={() => router.push(reportHref)}
          >
            Report this number
          </button>
          {analysisId && (
            <button
              type="button"
              className="btn-pill btn-secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `${window.location.origin}/a/${analysisId}`,
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? "Link copied" : "Share link"}
            </button>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <h2 className="mono-label text-muted">Evidence</h2>
          <div className="mt-4 space-y-4">
            {result.evidence.map((e, i) => (
              <div key={i} className="rounded-card bg-stone p-6">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${SEVERITY_DOT[e.severity]}`}
                  />
                  <span className="mono-label text-muted">{e.severity}</span>
                  {audioUrl && e.segmentIds.length > 0 && (
                    <button
                      type="button"
                      className="btn-pill btn-secondary ml-auto !py-1.5 !px-4 text-xs"
                      onClick={() => playEvidence(e.segmentIds)}
                    >
                      ▶ Play {fmtTime(segById.get(e.segmentIds[0])?.start ?? 0)}
                      {" to "}{fmtTime(segById.get(e.segmentIds[e.segmentIds.length - 1])?.end ?? 0)}
                    </button>
                  )}
                </div>
                <h3 className="mt-3 font-display text-lg">{e.title}</h3>
                <blockquote className="mt-2 border-l-2 border-coral pl-3 text-sm italic">
                  “{e.quote}”
                </blockquote>
                <p className="mt-2 text-sm text-ink/70">{e.why}</p>
              </div>
            ))}
          </div>

          {result.claimChecks.length > 0 && (
            <>
              <h2 className="mono-label mt-12 text-muted">Claim checks</h2>
              <div className="mt-4 space-y-4">
                {result.claimChecks.map((c, i) => (
                  <div key={i} className="rounded-card border border-hairline p-6">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-medium">{c.claim}</p>
                      <span
                        className={`mono-label shrink-0 rounded-pill px-3 py-1 ${STATUS_STYLE[c.status]}`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink/70">{c.finding}</p>
                    {c.sources.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {c.sources.map((s, j) => (
                          <li key={j}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue hover:underline"
                            >
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {result.supportNumbers.length > 0 && (
            <>
              <h2 className="mono-label mt-12 text-muted">Official support</h2>
              <div className="mt-4 space-y-3">
                {result.supportNumbers.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between rounded-card border border-hairline px-6 py-4"
                  >
                    <div>
                      <p className="font-medium">{s.service}</p>
                      <p className="text-sm text-muted">{s.note}</p>
                    </div>
                    <span className="mono-label tabular text-xl">{s.number}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {result.whatToDo.length > 0 && (
            <>
              <h2 className="mono-label mt-12 text-muted">What to do</h2>
              <ol className="mt-4 space-y-2">
                {result.whatToDo.map((w, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mono-label text-muted">{i + 1}.</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {result.priorReports.length > 0 && (
            <>
              <h2 className="mono-label mt-12 text-muted">Prior reports</h2>
              <div className="mt-4 divide-y divide-hairline border-t border-b border-hairline">
                {result.priorReports.map((r, i) => (
                  <div key={i} className="flex justify-between py-3">
                    <span className="font-mono text-sm">{r.number}</span>
                    <span className="text-sm text-muted">
                      reported {r.count}× before
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <Link href="/" className="btn-pill btn-secondary mt-12">
            Analyze another
          </Link>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          {audioUrl ? (
            <AudioPlayer
              ref={playerRef}
              src={audioUrl}
              onTimeUpdate={(t) => {
                const seg = segments.find((s) => t >= s.start && t <= s.end + 0.05);
                setActiveId(seg?.id ?? null);
              }}
            />
          ) : (
            <div className="rounded-card bg-stone p-5 text-sm text-ink/70">
              Audio isn&apos;t stored. Upload the recording again to replay.
            </div>
          )}
          <div className="mt-6">
            <Transcript
              segments={segments}
              activeId={activeId}
              evidenceIds={evidenceIds}
              flashId={flashId}
              onSeek={(t) => playerRef.current?.seekTo(t)}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}
