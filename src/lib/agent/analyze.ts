import { z } from "zod";
import { askJson, MODEL_ID } from "./llm";
import { webSearch } from "./search";
import { ensureSchema, sql } from "../db";
import { normalizePhone } from "../phone";
import type { AnalysisResult, TranscriptSegment } from "../types";

const scamTypeEnum = z.enum([
  "otp_theft",
  "fake_promo",
  "impersonation",
  "fake_fee",
  "sim_swap",
  "wrong_transfer",
  "other",
  "none",
]);

const severityEnum = z.enum(["high", "medium", "low"]);

const extractionSchema = z.object({
  summary: z.string(),
  impersonatedService: z.string().nullable(),
  scamType: scamTypeEnum,
  claims: z
    .array(z.object({ text: z.string(), segmentIds: z.array(z.number()) }))
    .max(4),
  redFlags: z.array(
    z.object({
      title: z.string(),
      why: z.string(),
      quote: z.string(),
      segmentIds: z.array(z.number()),
      severity: severityEnum,
    }),
  ),
  numbersMentioned: z.array(z.string()),
  askedForCode: z.boolean(),
  urgencyPressure: z.boolean(),
});

const judgeSchema = z.object({
  verdict: z.enum(["scam", "suspicious", "likely_legit"]),
  confidence: z.number().min(0).max(100),
  headline: z.string(),
  explanation: z.string(),
  evidence: z.array(
    z.object({
      title: z.string(),
      why: z.string(),
      quote: z.string(),
      segmentIds: z.array(z.number()),
      severity: severityEnum,
    }),
  ),
  claimChecks: z.array(
    z.object({
      claim: z.string(),
      status: z.enum(["false", "unverified", "true"]),
      finding: z.string(),
      sources: z.array(z.object({ title: z.string(), url: z.string() })),
    }),
  ),
  supportNumbers: z.array(
    z.object({ service: z.string(), number: z.string(), note: z.string() }),
  ),
  whatToDo: z.array(z.string()).min(3).max(5),
});

type Extraction = z.infer<typeof extractionSchema>;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function transcriptLines(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `[#${s.id}] ${s.speaker} (${formatTime(s.start)}): ${s.text}`)
    .join("\n");
}

const EXTRACT_SYSTEM = `You analyze phone-call transcripts from Ghana to detect mobile-money scams (e.g. fake MTN/Telecel/AirtelTigo agents asking for OTP codes, fake promotions, fake fees, SIM-swap attempts, "wrong transfer" refund tricks). Extract structured facts only; do not judge yet. Claims are verifiable factual statements the caller makes (max 4, most important first). numbersMentioned are phone/account numbers spoken or asked for.`;

const JUDGE_SYSTEM = `You are a fraud judge for Ghanaian mobile-money scam calls. Given the extraction, web search results, and prior community reports, deliver a verdict. Rules: an agent asking the victim to read back a one-time code/PIN, demanding a "processing fee" to release money, or pressuring immediate action is almost always a scam. Official support numbers may only be listed if found in the provided web sources — otherwise return an empty list. Keep the headline under 90 characters and in plain language. Order evidence high→medium→low severity.`;

async function priorReportCounts(numbers: string[]): Promise<{ number: string; count: number }[]> {
  if (!sql || numbers.length === 0) return [];
  try {
    await ensureSchema();
    const normalized = [...new Set(numbers.map(normalizePhone))].filter(Boolean);
    if (normalized.length === 0) return [];
    const rows = (await sql`
      SELECT phone_normalized AS number, COUNT(*)::int AS count
      FROM reports
      WHERE phone_normalized = ANY(${normalized})
      GROUP BY phone_normalized
    `) as { number: string; count: number }[];
    return rows;
  } catch {
    return [];
  }
}

export async function analyzeTranscript(
  segments: TranscriptSegment[],
): Promise<AnalysisResult> {
  const lines = transcriptLines(segments);

  const extraction: Extraction = await askJson(
    extractionSchema,
    EXTRACT_SYSTEM,
    `Transcript of a recorded phone call:\n\n${lines}`,
  );

  const claimSearches = await Promise.all(
    extraction.claims.slice(0, 3).map((c) =>
      webSearch(
        `${c.text} ${extraction.impersonatedService ?? ""} Ghana scam`.trim(),
      ),
    ),
  );
  const supportSearch = extraction.impersonatedService
    ? await webSearch(
        `${extraction.impersonatedService} official customer care number Ghana`,
      )
    : { hits: [] as const, error: undefined };
  const priorReports = await priorReportCounts(extraction.numbersMentioned);

  const searchBlock = claimSearches
    .map((s, i) => {
      const claim = extraction.claims[i]?.text ?? "";
      const hits = s.hits
        .map((h) => `  - ${h.title} | ${h.url} | ${h.description.slice(0, 200)}`)
        .join("\n");
      return `Claim "${claim}"\n${hits || "  (no results)"}`;
    })
    .join("\n\n");
  const supportBlock = supportSearch.hits
    .map((h) => `  - ${h.title} | ${h.url} | ${h.description.slice(0, 200)}`)
    .join("\n");

  const judged = await askJson(
    judgeSchema,
    JUDGE_SYSTEM,
    `Transcript:\n${lines}\n\nExtraction:\n${JSON.stringify(extraction, null, 2)}\n\nWeb results for the caller's claims:\n${searchBlock || "(none)"}\n\nWeb results for the official support number of "${extraction.impersonatedService ?? "the service"}":\n${supportBlock || "(none)"}\n\nPrior community reports for numbers mentioned: ${JSON.stringify(priorReports)}`,
  );

  const severityRank = { high: 0, medium: 1, low: 2 };
  judged.evidence.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );

  return {
    ...judged,
    impersonatedService: extraction.impersonatedService,
    scamType: extraction.scamType,
    numbersMentioned: extraction.numbersMentioned,
    priorReports,
    model: MODEL_ID,
  };
}
