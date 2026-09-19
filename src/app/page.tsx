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
        if (!h.configured?.speechmatics)
          m.push("Speechmatics key not configured — set SPEECHMATICS_API_KEY on Render");
        if (!h.configured?.neonGateway)
          m.push("AI gateway not configured — set NEON_AI_GATEWAY_BASE_URL and NEON_AI_GATEWAY_TOKEN on Render");
        if (!h.configured?.firecrawl)
          m.push("Firecrawl key not configured — set FIRECRAWL_API_KEY on Render");
        if (!h.configured?.database)
          m.push("Database not configured — set DATABASE_URL on Render (needed for reports & saved analyses)");
        setMissing(m);
      })
      .catch(() => {});
  }, []);
  if (missing.length === 0) return null;
  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-card border border-hairline px-4 py-3">
      {missing.map((m) => (
        <p key={m} className="mono-label text-muted">
          {m}
        </p>
      ))}
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
        <span className="mono-label text-muted">Scam call analyzer</span>
        <div className="mt-4 flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="max-w-3xl font-display text-[44px] leading-none tracking-tight sm:text-[88px]">
            Hear the scam before the money leaves the phone.
          </h1>
          <div className="shrink-0">
            <Mascot size={140} />
          </div>
        </div>
        <p className="mt-6 max-w-xl text-lg text-ink/70">
          Upload a recording of a suspicious call. Fraudcatua transcribes it, checks
          the caller&apos;s claims on the web, and shows you the evidence — with
          timestamps.
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
