import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConfigured, ensureSchema, sql } from "@/lib/db";
import { maskPhone, normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const bodySchema = z.object({
  phoneNumber: z.string().min(3),
  service: z.string().optional().nullable(),
  scamType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  analysisId: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  optIn: z.boolean().optional(),
});

const POINTS_PER_REPORT = 10;

export async function POST(req: NextRequest) {
  if (!dbConfigured() || !sql) {
    return NextResponse.json({ error: "Connect the following envs: DATABASE_URL" }, { status: 500 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", detail: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const normalized = normalizePhone(b.phoneNumber);
  if (normalized.length < 6) {
    return NextResponse.json({ error: "Phone number looks too short" }, { status: 400 });
  }
  await ensureSchema();
  const inserted = (await sql`
    INSERT INTO reports (phone_number, phone_normalized, service, scam_type, notes, analysis_id, contact, opt_in, points)
    VALUES (${b.phoneNumber}, ${normalized}, ${b.service ?? null}, ${b.scamType ?? null},
            ${b.notes ?? null}, ${b.analysisId ?? null}, ${b.contact ?? null},
            ${b.optIn ?? false}, ${POINTS_PER_REPORT})
    RETURNING id
  `) as { id: number }[];
  let totalPointsForContact: number | null = null;
  if (b.contact) {
    const rows = (await sql`
      SELECT COALESCE(SUM(points), 0)::int AS total FROM reports WHERE contact = ${b.contact}
    `) as { total: number }[];
    totalPointsForContact = rows[0]?.total ?? 0;
  }
  return NextResponse.json({
    id: inserted[0]?.id,
    points: POINTS_PER_REPORT,
    totalPointsForContact,
  });
}

export async function GET(req: NextRequest) {
  if (!dbConfigured() || !sql) {
    return NextResponse.json({ error: "Connect the following envs: DATABASE_URL" }, { status: 500 });
  }
  const number = req.nextUrl.searchParams.get("number");
  if (!number) {
    return NextResponse.json({ error: "Missing ?number=" }, { status: 400 });
  }
  const normalized = normalizePhone(number);
  await ensureSchema();
  const countRows = (await sql`
    SELECT COUNT(*)::int AS count, MAX(created_at) AS last
    FROM reports WHERE phone_normalized = ${normalized}
  `) as { count: number; last: string | null }[];
  const serviceRows = (await sql`
    SELECT DISTINCT service FROM reports
    WHERE phone_normalized = ${normalized} AND service IS NOT NULL
  `) as { service: string }[];
  return NextResponse.json({
    number: maskPhone(normalized),
    count: countRows[0]?.count ?? 0,
    services: serviceRows.map((r) => r.service),
    lastReported: countRows[0]?.last ?? null,
  });
}
