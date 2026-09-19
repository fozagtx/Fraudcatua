"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mascot } from "@/components/Mascot";

function ConfigHint() {
  const [missing, setMissing] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => {
        const m: string[] = [];
        if (!h.configured?.speechmatics) m.push("SPEECHMATICS_API_KEY");
        if (!h.configured?.nebius) m.push("NEBIUS_API_KEY");
        if (!h.configured?.composio) m.push("COMPOSIO_API_KEY");
        if (!h.configured?.firecrawl) m.push("FIRECRAWL_API_KEY");
        if (!h.configured?.database) m.push("DATABASE_URL");
        setMissing(m);
      })
      .catch(() => {});
  }, []);
  if (missing.length === 0) return null;
  return (
    <div className="mx-auto max-w-6xl px-6 pb-16">
      <div className="rounded-card border border-hairline px-4 py-3">
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
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Listen",
    body: "Speechmatics transcribes the call with speakers and timestamps.",
  },
  {
    n: "02",
    title: "Verify",
    body: "Firecrawl checks the caller's claims against the web and prior reports.",
  },
  {
    n: "03",
    title: "Judge",
    body: "An open-weight model gives a verdict with evidence you can replay.",
  },
];

export default function Home() {
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
        <div className="mt-8 flex items-center gap-6">
          <Link href="/analyze" className="btn-pill btn-primary">
            Analyze a call
          </Link>
          <Link href="/finance" className="text-sm text-blue underline underline-offset-4">
            Watch my money
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-card bg-stone p-8">
              <span className="mono-label text-muted">{s.n}</span>
              <h2 className="mt-4 font-display text-2xl">{s.title}</h2>
              <p className="mt-3 text-sm text-ink/70">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mb-16 rounded-band bg-deep-green px-8 py-14 text-white sm:mx-auto sm:max-w-6xl sm:px-14">
        <span className="mono-label text-white/60">AI finance employee</span>
        <h2 className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          An AI finance employee that watches over your money.
        </h2>
        <p className="mt-4 max-w-2xl text-white/80">
          Businesses pay the same invoice twice all the time, simply because nobody
          had time to reconcile. Scammers know that trick and reuse it. Connect
          Gmail and Fraudcatua reads your invoice mail, flags duplicates and
          mismatched senders, and tells you what to do before you pay again.
        </p>
        <Link
          href="/finance"
          className="btn-pill mt-8 inline-flex bg-white text-ink hover:bg-white/90"
        >
          Connect Gmail
        </Link>
      </section>

      <ConfigHint />
    </>
  );
}
