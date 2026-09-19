import { describe, expect, it } from "vitest";
import { findInvoiceIssues, normalizeVendor } from "./rules";
import type { Invoice } from "./types";

const inv = (over: Partial<Invoice>): Invoice => ({
  emailId: "e0",
  vendor: "Acme Ltd",
  invoiceNumber: null,
  amount: null,
  currency: "USD",
  invoiceDate: "2026-01-10",
  status: "unknown",
  isRequestForPayment: true,
  ...over,
});

describe("findInvoiceIssues", () => {
  it("flags same vendor + same amount within 45 days as duplicate", () => {
    const emails = new Map([
      ["e1", "billing@acme.com"],
      ["e2", "billing@acme.com"],
    ]);
    const findings = findInvoiceIssues(
      [
        inv({ emailId: "e1", amount: 500, invoiceDate: "2026-01-10" }),
        inv({ emailId: "e2", amount: 500, invoiceDate: "2026-02-01" }),
      ],
      emails,
    );
    expect(findings.some((f) => f.kind === "duplicate_invoice")).toBe(true);
  });

  it("does not flag same vendor + same amount beyond 45 days", () => {
    const findings = findInvoiceIssues(
      [
        inv({ emailId: "e1", amount: 500, invoiceDate: "2026-01-01" }),
        inv({ emailId: "e2", amount: 500, invoiceDate: "2026-04-01" }),
      ],
      new Map(),
    );
    expect(findings.filter((f) => f.kind === "duplicate_invoice")).toHaveLength(0);
  });

  it("flags same invoice number regardless of date", () => {
    const findings = findInvoiceIssues(
      [
        inv({ emailId: "e1", invoiceNumber: "INV-9", invoiceDate: "2025-01-01" }),
        inv({ emailId: "e2", invoiceNumber: "INV-9", invoiceDate: "2026-06-01" }),
      ],
      new Map(),
    );
    const dup = findings.find((f) => f.kind === "duplicate_invoice");
    expect(dup).toBeDefined();
    expect(dup?.severity).toBe("high");
  });

  it("flags a due request matching a paid invoice as already_paid", () => {
    const findings = findInvoiceIssues(
      [
        inv({ emailId: "e1", amount: 300, status: "paid" }),
        inv({ emailId: "e2", amount: 300, status: "due" }),
      ],
      new Map(),
    );
    expect(findings.some((f) => f.kind === "already_paid")).toBe(true);
  });

  it("flags the same vendor from two sender domains", () => {
    const emails = new Map([
      ["e1", "billing@acme.com"],
      ["e2", "billing@acme-payments.xyz"],
    ]);
    const findings = findInvoiceIssues(
      [
        inv({ emailId: "e1", vendor: "Acme Ltd", amount: 100, invoiceDate: "2026-01-01" }),
        inv({ emailId: "e2", vendor: "Acme Ltd", amount: 200, invoiceDate: "2026-01-15" }),
      ],
      emails,
    );
    expect(findings.some((f) => f.kind === "sender_mismatch")).toBe(true);
  });
});

describe("normalizeVendor", () => {
  it("strips case and punctuation", () => {
    expect(normalizeVendor("Acme, Ltd.")).toBe("acmeltd");
  });
});
