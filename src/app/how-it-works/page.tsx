import Link from "next/link";

export const metadata = { title: "How it works: Fraudcatua" };

const CAPABILITIES = [
  {
    n: "01",
    title: "Listen",
    body: "Speechmatics transcribes the call with speaker diarization. An enhanced model separates the caller from you and timestamps every word.",
  },
  {
    n: "02",
    title: "Judge",
    body: "An open-weight model (via Nebius Token Factory) reads the transcript, extracts the caller's claims, red flags, and any numbers mentioned, then weighs it all into a verdict.",
  },
  {
    n: "03",
    title: "Verify",
    body: "Each factual claim is checked live on the web with Firecrawl: 'MTN gives free money', fake fees, official support numbers. Evidence is grounded, not guessed.",
  },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <span className="mono-label text-muted">How it works</span>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-none tracking-tight sm:text-6xl">
        A small agent that listens, judges, and verifies.
      </h1>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {CAPABILITIES.map((c) => (
          <div key={c.n} className="rounded-card bg-stone p-8">
            <span className="mono-label text-muted">{c.n}</span>
            <h2 className="mt-4 font-display text-2xl">{c.title}</h2>
            <p className="mt-3 text-sm text-ink/70">{c.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-20">
        <h2 className="mono-label text-muted">The pipeline</h2>
        <ol className="mt-6 max-w-2xl space-y-4">
          {[
            ["Transcribe", "Your recording goes to Speechmatics; words come back grouped into speaker turns with timestamps."],
            ["Extract", "The model pulls out who is being impersonated, the scam pattern, verifiable claims, red flags, and phone numbers, each tied to transcript segments."],
            ["Verify", "Firecrawl searches the web for each claim and for the impersonated service's official support number. Reported numbers are checked against the community database."],
            ["Judge", "A second pass weighs the extraction, the web evidence, and prior reports into a verdict with confidence, evidence quotes, and what to do next."],
          ].map(([t, b], i) => (
            <li key={t} className="flex gap-6 border-b border-hairline pb-4">
              <span className="mono-label text-muted">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-medium">{t}</p>
                <p className="text-sm text-ink/70">{b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-band mt-20 bg-deep-green px-8 py-14 text-white sm:px-14">
        <span className="mono-label text-white/60">One shared memory</span>
        <h2 className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          Every report makes the next caller easier to catch.
        </h2>
        <p className="mt-4 max-w-2xl text-white/80">
          When you report a scammer&apos;s number, it joins a shared database. The next
          person who gets a call from that number sees it was reported before, and
          you earn gift points for verified reports.
        </p>
        <Link href="/report" className="btn-pill mt-8 inline-flex bg-white text-ink hover:bg-white/90">
          Report a number
        </Link>
      </section>
    </div>
  );
}
