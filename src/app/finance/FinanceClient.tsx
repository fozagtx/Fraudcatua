"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FinanceReport, Invoice } from "@/lib/finance/types";

const USER_KEY = "fc_user";
const SEVERITY_DOT: Record<string, string> = {
  high: "bg-coral",
  medium: "bg-coral-soft",
  low: "bg-muted",
};

type Status = "loading" | "connected" | "disconnected" | "unconfigured";

export function FinanceClient() {
  const [userId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_KEY, id);
    }
    return id;
  });
  const [status, setStatus] = useState<Status>("loading");
  const [days, setDays] = useState(90);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(
    async (uid: string) => {
      try {
        const res = await fetch(`/api/finance/status?userId=${encodeURIComponent(uid)}`);
        const json = await res.json();
        if (!res.ok) {
          setStatus("unconfigured");
          return;
        }
        setStatus(json.connected ? "connected" : "disconnected");
      } catch {
        setStatus("unconfigured");
      }
    },
    [],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/finance/status?userId=${encodeURIComponent(userId)}`)
      .then(async (r) => ({ ok: r.ok, json: await r.json() }))
      .then(({ ok, json }) => {
        if (cancelled) return;
        setStatus(ok ? (json.connected ? "connected" : "disconnected") : "unconfigured");
      })
      .catch(() => {
        if (!cancelled) setStatus("unconfigured");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const connect = async () => {
    if (!userId) return;
    setError(null);
    const res = await fetch("/api/finance/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, returnTo: window.location.href }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Connect failed");
      return;
    }
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => void checkStatus(userId), 4000);
    window.location.href = json.redirectUrl;
  };

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const scan = async () => {
    if (!userId) return;
    setScanning(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/finance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, days }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Scan failed");
      setReport(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const invByEmailId = (report: FinanceReport | null) =>
    new Map((report?.invoices ?? []).map((v: Invoice) => [v.emailId, v]));

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <span className="mono-label text-muted">AI finance employee</span>
      <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">
        Your AI finance employee.
      </h1>
      <p className="mt-4 max-w-xl text-ink/70">
        It reads your invoice mail, flags the same invoice billed twice or from the
        wrong sender, and tells you what to do before you pay.
      </p>

      <div className="mt-10 rounded-card bg-stone p-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="mono-label text-muted">Gmail</span>
          <span
            className={`mono-label rounded-pill px-3 py-1 ${
              status === "connected"
                ? "bg-deep-green text-white"
                : "border border-hairline text-muted"
            }`}
          >
            {status === "loading"
              ? "checking"
              : status === "connected"
                ? "connected"
                : status === "unconfigured"
                  ? "not configured"
                  : "not connected"}
          </span>
          {status !== "connected" && (
            <button type="button" className="btn-pill btn-primary" onClick={connect}>
              Connect Gmail
            </button>
          )}
          {status === "connected" && (
            <div className="ml-auto flex items-center gap-3">
              <select
                className="rounded-card border border-hairline bg-white px-3 py-2 text-sm"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 180 days</option>
              </select>
              <button
                type="button"
                className="btn-pill btn-primary"
                disabled={scanning}
                onClick={scan}
              >
                {scanning ? "Scanning…" : "Scan invoices"}
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-4 text-sm text-error">{error}</p>}
      </div>

      {report && (
        <>
          <section className="rounded-band mt-10 bg-deep-green px-8 py-10 text-white sm:px-14">
            <div className="flex flex-wrap gap-10">
              <div>
                <span className="mono-label text-white/60">Emails scanned</span>
                <p className="mt-1 font-display text-4xl tabular">{report.scannedEmails}</p>
              </div>
              <div>
                <span className="mono-label text-white/60">Invoices found</span>
                <p className="mt-1 font-display text-4xl tabular">{report.invoices.length}</p>
              </div>
              <div>
                <span className="mono-label text-white/60">Findings</span>
                <p className="mt-1 font-display text-4xl tabular">{report.findings.length}</p>
              </div>
              <div>
                <span className="mono-label text-white/60">Total at risk</span>
                <p className="mt-1 font-display text-4xl tabular">
                  {report.currency ?? ""} {report.totalAtRisk.toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10 space-y-4">
            {report.findings.length === 0 && (
              <p className="text-ink/70">No billing anomalies found. Nice and clean.</p>
            )}
            {report.findings.map((f, i) => {
              const byId = invByEmailId(report);
              const invs = f.invoiceIds.map((id) => byId.get(id)).filter(Boolean) as Invoice[];
              return (
                <div key={i} className="rounded-card bg-stone p-6">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${SEVERITY_DOT[f.severity]}`} />
                    <span className="mono-label text-muted">
                      {f.severity} · {f.kind.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg">{f.headline}</h3>
                  <p className="mt-2 text-sm text-ink/70">{f.explanation}</p>
                  {invs.length > 0 && (
                    <div className="mt-4 divide-y divide-hairline border-t border-b border-hairline">
                      {invs.map((v) => (
                        <div key={v.emailId} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                          <div>
                            <p className="text-sm font-medium">{v.vendor}</p>
                            <p className="text-sm text-muted">
                              {v.invoiceNumber ?? "no invoice number"} · {v.invoiceDate ?? "no date"} · {v.status}
                            </p>
                          </div>
                          <span className="font-mono text-sm tabular">
                            {v.currency ?? ""} {v.amount ?? "?"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {f.action && <p className="mt-3 text-sm font-medium">{f.action}</p>}
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
