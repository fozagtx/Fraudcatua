import { z } from "zod";
import { askJson } from "../agent/llm";
import { findInvoiceIssues } from "./rules";
import type { FinanceReport, Finding, Invoice, InvoiceEmail } from "./types";

const invoiceSchema = z.object({
  emailId: z.string(),
  vendor: z.string(),
  invoiceNumber: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  status: z.enum(["paid", "due", "unknown"]),
  isRequestForPayment: z.boolean(),
});

const extractSchema = z.object({ invoices: z.array(invoiceSchema) });

const judgedSchema = z.object({
  findings: z.array(
    z.object({
      invoiceIds: z.array(z.string()),
      headline: z.string(),
      explanation: z.string(),
      action: z.string(),
      severity: z.enum(["high", "medium", "low"]),
    }),
  ),
});

const EXTRACT_SYSTEM = `You extract invoice data from business emails. For each email that is an invoice, receipt, bill, or payment request, output vendor name, invoice number if present, total amount, currency code, invoice date (ISO), status (paid when the email confirms payment, due when it requests payment, unknown otherwise), and isRequestForPayment. Skip emails that are not invoices or payment requests. Use the provided emailId verbatim.`;

const JUDGE_SYSTEM = `You are a cautious finance assistant reviewing detected billing anomalies. For each flagged group of invoices, write a short headline, a one-or-two sentence explanation of the risk (e.g. paying the same invoice twice, or a vendor billing from an unusual domain), and a concrete recommended action. Do not invent facts beyond the invoice fields given.`;

export async function analyzeInvoices(
  emails: InvoiceEmail[],
): Promise<FinanceReport> {
  const invoices: Invoice[] = [];

  for (let i = 0; i < emails.length; i += 10) {
    const batch = emails.slice(i, i + 10);
    const input = batch
      .map(
        (e) =>
          `emailId: ${e.id}\nfrom: ${e.from}\ndate: ${e.date}\nsubject: ${e.subject}\nbody: ${e.body}`,
      )
      .join("\n\n---\n\n");
    const res = await askJson(extractSchema, EXTRACT_SYSTEM, input);
    const byId = new Map(batch.map((e) => [e.id, e]));
    for (const inv of res.invoices) {
      if (byId.has(inv.emailId)) invoices.push(inv);
    }
  }

  const fromByEmailId = new Map(emails.map((e) => [e.id, e.from]));
  const raw = findInvoiceIssues(invoices, fromByEmailId);

  const findings: Finding[] = [];
  if (raw.length > 0) {
    const invById = new Map(invoices.map((v) => [v.emailId, v]));
    const judged = await askJson(
      judgedSchema,
      JUDGE_SYSTEM,
      raw
        .map((f) => {
          const invs = f.invoiceIds
            .map((id) => invById.get(id))
            .filter(Boolean)
            .map(
              (v) =>
                `  - emailId ${v!.emailId}: vendor=${v!.vendor}, number=${v!.invoiceNumber}, amount=${v!.amount} ${v!.currency}, date=${v!.invoiceDate}, status=${v!.status}, sender=${fromByEmailId.get(v!.emailId) ?? ""}`,
            )
            .join("\n");
          return `Finding (${f.kind}, severity ${f.severity}):\n${invs}`;
        })
        .join("\n\n"),
    );
    for (const f of raw) {
      const j = judged.findings.find(
        (x) =>
          x.invoiceIds.length === f.invoiceIds.length &&
          x.invoiceIds.every((id) => f.invoiceIds.includes(id)),
      );
      findings.push({
        kind: f.kind,
        severity: j?.severity ?? f.severity,
        invoiceIds: f.invoiceIds,
        headline:
          j?.headline ?? `Possible ${f.kind.replaceAll("_", " ")}`,
        explanation: j?.explanation ?? "",
        action: j?.action ?? "",
      });
    }
  }

  const invById2 = new Map(invoices.map((v) => [v.emailId, v]));
  let totalAtRisk = 0;
  let currency: string | null = null;
  for (const f of findings) {
    for (const id of f.invoiceIds.slice(1)) {
      const inv = invById2.get(id);
      if (inv?.amount != null) {
        totalAtRisk += inv.amount;
        currency = currency ?? inv.currency;
      }
    }
  }

  return {
    scannedEmails: emails.length,
    invoices,
    findings,
    totalAtRisk,
    currency,
  };
}
