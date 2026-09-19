"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const SERVICES = [
  "MTN MoMo",
  "Telecel Cash",
  "AirtelTigo Money",
  "GCB Bank",
  "Ecobank",
  "Fidelity Bank",
  "Ghana Police",
  "Other",
];

const SCAM_TYPES = [
  ["otp_theft", "Asked for a code / OTP"],
  ["fake_promo", "Fake promotion or prize"],
  ["impersonation", "Impersonated a company or official"],
  ["fake_fee", "Demanded a fee to release money"],
  ["sim_swap", "SIM-swap attempt"],
  ["wrong_transfer", "\"Wrong transfer\" refund trick"],
  ["other", "Other"],
] as const;

type Recent = {
  reports: { number: string; service: string | null; scamType: string | null; createdAt: string }[];
  totalReports: number;
};

type Lookup = {
  number: string;
  count: number;
  services: string[];
  lastReported: string | null;
};

const inputCls =
  "w-full rounded-card border border-hairline bg-white px-4 py-3 text-sm transition-colors focus:border-focus";
const labelCls = "mono-label mb-2 block text-muted";

export function ReportClient() {
  const params = useSearchParams();
  const [phone, setPhone] = useState(params.get("number") ?? "");
  const [service, setService] = useState(params.get("service") ?? "");
  const [scamType, setScamType] = useState(params.get("scamType") ?? "");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ points: number; total: number | null } | null>(null);

  const [lookupNumber, setLookupNumber] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent | null>(null);

  const analysisId = params.get("analysisId");

  useEffect(() => {
    fetch("/api/reports/recent")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRecent(d))
      .catch(() => {});
  }, []);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          service: service || null,
          scamType: scamType || null,
          notes: notes || null,
          analysisId: analysisId || null,
          contact: contact || null,
          optIn,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Report failed");
      setSuccess({ points: json.points, total: json.totalPointsForContact });
      fetch("/api/reports/recent")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setRecent(d))
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    } finally {
      setSubmitting(false);
    }
  };

  const checkNumber = async () => {
    setLookupError(null);
    setLookup(null);
    try {
      const res = await fetch(`/api/reports?number=${encodeURIComponent(lookupNumber)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Lookup failed");
      setLookup(json);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <span className="mono-label text-muted">Community reports</span>
      <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">
        Report a scam number.
      </h1>
      <p className="mt-4 max-w-xl text-ink/70">
        Every report feeds one shared memory of scammer numbers — and earns you gift
        points if you opt in.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="rounded-card bg-stone p-8">
          {success ? (
            <div>
              <span className="mono-label text-muted">Report filed</span>
              <p className="mt-4 font-display text-4xl">+{success.points} points</p>
              {success.total != null && (
                <p className="mt-2 text-ink/70">
                  Total points for your contact: <strong>{success.total}</strong>
                </p>
              )}
              <button
                type="button"
                className="btn-pill btn-secondary mt-6"
                onClick={() => {
                  setSuccess(null);
                  setPhone("");
                  setNotes("");
                }}
              >
                Report another
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className={labelCls} htmlFor="phone">
                  Scammer&apos;s number *
                </label>
                <input
                  id="phone"
                  className={inputCls}
                  placeholder="024 412 3456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="service">
                  Service impersonated
                </label>
                <select
                  id="service"
                  className={inputCls}
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                >
                  <option value="">—</option>
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="scamType">
                  Scam type
                </label>
                <select
                  id="scamType"
                  className={inputCls}
                  value={scamType}
                  onChange={(e) => setScamType(e.target.value)}
                >
                  <option value="">—</option>
                  {SCAM_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="notes">
                  What happened
                </label>
                <textarea
                  id="notes"
                  className={`${inputCls} min-h-28`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              {analysisId && (
                <p className="mono-label text-muted">
                  Attached analysis: {analysisId}
                </p>
              )}
              <div>
                <label className={labelCls} htmlFor="contact">
                  Email or phone — to receive gifts (optional)
                </label>
                <input
                  id="contact"
                  className={inputCls}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                />
                <span>
                  Opt in to receive airtime / data gifts for verified reports. 10
                  points per report.
                </span>
              </label>
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                type="button"
                className="btn-pill btn-primary w-full"
                disabled={submitting || phone.trim().length < 3}
                onClick={submit}
              >
                {submitting ? "Sending…" : "File report"}
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="rounded-card border border-hairline p-6">
            <span className="mono-label text-muted">Number lookup</span>
            <div className="mt-4 flex gap-3">
              <input
                className={inputCls}
                placeholder="Check a number"
                value={lookupNumber}
                onChange={(e) => setLookupNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkNumber()}
              />
              <button type="button" className="btn-pill btn-secondary shrink-0" onClick={checkNumber}>
                Check
              </button>
            </div>
            {lookupError && <p className="mt-3 text-sm text-error">{lookupError}</p>}
            {lookup && (
              <div className="mt-4 text-sm">
                {lookup.count === 0 ? (
                  <p className="text-ink/70">No reports for {lookup.number} yet.</p>
                ) : (
                  <>
                    <p className="font-medium">
                      {lookup.number} — reported {lookup.count}×
                    </p>
                    {lookup.services.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {lookup.services.map((s) => (
                          <span key={s} className="mono-label rounded-pill bg-coral px-3 py-1 text-white">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {lookup.lastReported && (
                      <p className="mt-2 text-muted">
                        Last reported {new Date(lookup.lastReported).toLocaleDateString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-10">
            <div className="flex items-baseline justify-between">
              <span className="mono-label text-muted">Recently reported</span>
              {recent && (
                <span className="font-display text-3xl">{recent.totalReports}</span>
              )}
            </div>
            <div className="mt-4 divide-y divide-hairline border-t border-b border-hairline">
              {recent == null ? (
                <p className="py-4 text-sm text-muted">
                  Reports need a database — set DATABASE_URL.
                </p>
              ) : recent.reports.length === 0 ? (
                <p className="py-4 text-sm text-muted">No reports yet — be the first.</p>
              ) : (
                recent.reports.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-3">
                    <span className="font-mono text-sm tabular">{r.number}</span>
                    <span className="flex items-center gap-3">
                      {r.service && (
                        <span className="mono-label rounded-pill bg-stone px-3 py-1">{r.service}</span>
                      )}
                      <span className="text-sm text-muted">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
