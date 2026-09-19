import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema, sql } from "@/lib/db";
import { maskPhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function GET() {
  if (!dbConfigured() || !sql) {
    return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 500 });
  }
  await ensureSchema();
  const rows = (await sql`
    SELECT phone_normalized, service, scam_type, created_at
    FROM reports ORDER BY created_at DESC LIMIT 20
  `) as {
    phone_normalized: string;
    service: string | null;
    scam_type: string | null;
    created_at: string;
  }[];
  const total = (await sql`SELECT COUNT(*)::int AS c FROM reports`) as { c: number }[];
  return NextResponse.json({
    reports: rows.map((r) => ({
      number: maskPhone(r.phone_normalized),
      service: r.service,
      scamType: r.scam_type,
      createdAt: r.created_at,
    })),
    totalReports: total[0]?.c ?? 0,
  });
}
