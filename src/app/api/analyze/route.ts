import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeTranscript } from "@/lib/agent/analyze";
import { missingGatewayEnvs } from "@/lib/agent/llm";
import { dbConfigured, ensureSchema, sql } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  segments: z.array(
    z.object({
      id: z.number(),
      speaker: z.string(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
      words: z.array(
        z.object({ w: z.string(), start: z.number(), end: z.number() }),
      ),
    }),
  ),
  fileName: z.string().optional(),
  durationS: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const missingEnvs = missingGatewayEnvs();
  if (missingEnvs.length > 0) {
    return NextResponse.json(
      { error: `Connect the following envs: ${missingEnvs.join(", ")}` },
      { status: 500 },
    );
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", detail: parsed.error.flatten() }, { status: 400 });
  }
  const { segments, fileName, durationS } = parsed.data;
  try {
    const result = await analyzeTranscript(segments);
    let id: string | null = null;
    if (dbConfigured() && sql) {
      try {
        await ensureSchema();
        id = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
        await sql`
          INSERT INTO analyses (id, file_name, duration_s, transcript, result)
          VALUES (${id}, ${fileName ?? null}, ${durationS ?? null}, ${JSON.stringify(segments)}, ${JSON.stringify(result)})
        `;
      } catch (err) {
        console.error("Failed to store analysis:", err);
        id = null;
      }
    }
    return NextResponse.json({ id, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
