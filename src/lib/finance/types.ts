export type InvoiceEmail = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
};

export type Invoice = {
  emailId: string;
  vendor: string;
  invoiceNumber: string | null;
  amount: number | null;
  currency: string | null;
  invoiceDate: string | null;
  status: "paid" | "due" | "unknown";
  isRequestForPayment: boolean;
};

export type FindingKind =
  | "duplicate_invoice"
  | "already_paid"
  | "sender_mismatch";

export type Finding = {
  kind: FindingKind;
  severity: "high" | "medium" | "low";
  invoiceIds: string[];
  headline: string;
  explanation: string;
  action: string;
};

export type FinanceReport = {
  scannedEmails: number;
  invoices: Invoice[];
  findings: Finding[];
  totalAtRisk: number;
  currency: string | null;
};
