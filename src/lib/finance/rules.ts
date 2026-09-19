import { config } from "../../config";
import type { FindingKind, Invoice } from "./types";

export function normalizeVendor(vendor: string): string {
  return vendor.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function senderDomain(from: string): string {
  const m = from.match(/@([A-Za-z0-9.-]+)/);
  return m ? m[1].toLowerCase() : from.toLowerCase();
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.abs(ta - tb) / 86400000;
}

export type RawFinding = {
  kind: FindingKind;
  severity: "high" | "medium" | "low";
  invoiceIds: string[];
};

/**
 * Deterministic duplicate/mismatch detection over extracted invoices.
 * - duplicate_invoice: same normalized vendor + same amount within 45 days,
 *   or same invoice number.
 * - already_paid: a "due" request matching a "paid" invoice (vendor+amount or
 *   invoice number).
 * - sender_mismatch: same vendor name arriving from two sender domains.
 */
export function findInvoiceIssues(
  invoices: Invoice[],
  fromByEmailId: Map<string, string> = new Map(),
): RawFinding[] {
  const findings: RawFinding[] = [];
  const seen = new Set<string>();
  const window = config.finance.duplicateWindowDays;

  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i];
      const b = invoices[j];
      const sameVendor =
        normalizeVendor(a.vendor) !== "" &&
        normalizeVendor(a.vendor) === normalizeVendor(b.vendor);
      const sameNumber =
        a.invoiceNumber != null &&
        a.invoiceNumber === b.invoiceNumber;
      const sameAmount =
        a.amount != null && b.amount != null && a.amount === b.amount;
      const closeEnough =
        daysBetween(a.invoiceDate, b.invoiceDate) == null ||
        (daysBetween(a.invoiceDate, b.invoiceDate) as number) <= window;

      const dupKey = `dup:${a.emailId}:${b.emailId}`;
      if (
        !seen.has(dupKey) &&
        ((sameVendor && sameAmount && closeEnough) || sameNumber)
      ) {
        findings.push({
          kind: "duplicate_invoice",
          severity: sameNumber ? "high" : "medium",
          invoiceIds: [a.emailId, b.emailId],
        });
        seen.add(dupKey);
      }

      const paidOne =
        a.status === "paid" ? a : b.status === "paid" ? b : null;
      const dueOne =
        paidOne === a ? (b.status === "due" ? b : null) : a.status === "due" ? a : null;
      const paidKey = `paid:${a.emailId}:${b.emailId}`;
      if (
        paidOne &&
        dueOne &&
        !seen.has(paidKey) &&
        ((sameVendor && sameAmount) || sameNumber)
      ) {
        findings.push({
          kind: "already_paid",
          severity: "high",
          invoiceIds: [paidOne.emailId, dueOne.emailId],
        });
        seen.add(paidKey);
      }
    }
  }

  const byVendor = new Map<string, Set<string>>();
  const idsByVendor = new Map<string, string[]>();
  for (const inv of invoices) {
    const v = normalizeVendor(inv.vendor);
    if (!v) continue;
    const domains = byVendor.get(v) ?? new Set<string>();
    domains.add(senderDomain(fromByEmailId.get(inv.emailId) ?? ""));
    byVendor.set(v, domains);
    idsByVendor.set(v, [...(idsByVendor.get(v) ?? []), inv.emailId]);
  }
  for (const [v, domains] of byVendor) {
    if (domains.size > 1) {
      findings.push({
        kind: "sender_mismatch",
        severity: "medium",
        invoiceIds: idsByVendor.get(v) ?? [],
      });
    }
  }
  return findings;
}
