import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema, sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured() || !sql) {
    return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 500 });
  }
  const { id } = await params;
  await ensureSchema();
  const rows = (await sql`
    SELECT id, created_at, file_name, duration_s, transcript, result
    FROM analyses WHERE id = ${id}
  `) as {
    id: string;
    created_at: string;
    file_name: string | null;
    duration_s: number | null;
    transcript: unknown;
    result: unknown;
  }[];
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: row.id,
    createdAt: row.created_at,
    fileName: row.file_name,
    durationS: row.duration_s,
    segments: row.transcript,
    result: row.result,
  });
}
