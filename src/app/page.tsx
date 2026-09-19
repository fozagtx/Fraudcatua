"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Analyzer } from "@/components/analyzer/Analyzer";
import { Mascot } from "@/components/Mascot";
import { SAMPLE_RESULT, SAMPLE_SEGMENTS } from "@/lib/sample";

function ConfigHint() {
  const [missing, setMissing] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => {
        const m: string[] = [];
        if (!h.configured?.speechmatics) m.push("SPEECHMATICS_API_KEY");
        if (!h.configured?.neonGateway) {
          m.push("NEON_AI_GATEWAY_BASE_URL", "NEON_AI_GATEWAY_TOKEN");
        }
        if (!h.configured?.firecrawl) m.push("FIRECRAWL_API_KEY");
        if (!h.configured?.database) m.push("DATABASE_URL");
        setMissing(m);
      })
      .catch(() => {});
  }, []);
  if (missing.length === 0) return null;
  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-card border border-hairline px-4 py-3">
      <span className="mono-label text-muted">Connect the following envs</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {missing.map((m) => (
          <span
            key={m}
            className="mono-label rounded-pill bg-stone px-3 py-1 text-ink"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function HomeInner() {
  const params = useSearchParams();
  const demo =
    params.get("demo") === "1" && process.env.NODE_ENV !== "production"
      ? { result: SAMPLE_RESULT, segments: SAMPLE_SEGMENTS }
      : undefined;

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <div className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="max-w-3xl font-display text-[44px] leading-none tracking-tight sm:text-[88px]">
            Understand where your money goes before you hit send.
          </h1>
          <div className="shrink-0">
            <Mascot size={140} />
          </div>
        </div>
        <p className="mt-6 max-w-xl text-lg text-ink/70">
          Upload a recording of a suspicious call. Fraudcatua transcribes it, checks
          the caller&apos;s claims, and shows you the evidence with timestamps.
        </p>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-20">
        {demo ? (
          <Analyzer demo={demo} />
        ) : (
          <>
            <Analyzer />
            <ConfigHint />
          </>
        )}
      </section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}
