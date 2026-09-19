export type TranscriptWord = { w: string; start: number; end: number };

export type TranscriptSegment = {
  id: number;
  speaker: string;
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
};

export type Severity = "high" | "medium" | "low";

export type Evidence = {
  title: string;
  why: string;
  quote: string;
  segmentIds: number[];
  severity: Severity;
};

export type ClaimCheck = {
  claim: string;
  status: "false" | "unverified" | "true";
  finding: string;
  sources: { title: string; url: string }[];
};

export type SupportNumber = { service: string; number: string; note: string };

export type ScamType =
  | "otp_theft"
  | "fake_promo"
  | "impersonation"
  | "fake_fee"
  | "sim_swap"
  | "wrong_transfer"
  | "other"
  | "none";

export type Verdict = "scam" | "suspicious" | "likely_legit";

export type AnalysisResult = {
  verdict: Verdict;
  confidence: number;
  headline: string;
  explanation: string;
  evidence: Evidence[];
  claimChecks: ClaimCheck[];
  supportNumbers: SupportNumber[];
  whatToDo: string[];
  impersonatedService: string | null;
  scamType: ScamType;
  numbersMentioned: string[];
  priorReports: { number: string; count: number }[];
  model: string;
};
