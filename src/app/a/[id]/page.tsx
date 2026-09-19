import { notFound } from "next/navigation";
import { dbConfigured, ensureSchema, sql } from "@/lib/db";
import type { AnalysisResult, TranscriptSegment } from "@/lib/types";
import { ResultView } from "@/components/analyzer/ResultView";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!dbConfigured() || !sql) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-error">Connect the following envs: DATABASE_URL</p>
      </div>
    );
  }
  await ensureSchema();
  const rows = (await sql`
    SELECT transcript, result FROM analyses WHERE id = ${id}
  `) as { transcript: TranscriptSegment[]; result: AnalysisResult }[];
  const row = rows[0];
  if (!row) notFound();
  return (
    <ResultView
      result={row.result}
      segments={row.transcript}
      audioUrl={null}
      analysisId={id}
    />
  );
}
