import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { missingGatewayEnvs } from "@/lib/agent/llm";
import { config } from "@/config";
import { dbConfigured, ensureSchema, sql } from "@/lib/db";
import { fetchInvoiceEmails, getGmailConnection } from "@/lib/finance/composio";
import { analyzeInvoices } from "@/lib/finance/analyze";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  userId: z.string().min(1),
  days: z.number().int().min(1).max(365).optional(),
});

export async function POST(req: NextRequest) {
  const missingEnvs = [
    ...(!process.env.COMPOSIO_API_KEY ? ["COMPOSIO_API_KEY"] : []),
    ...missingGatewayEnvs(),
  ];
  if (missingEnvs.length > 0) {
    return NextResponse.json(
      { error: `Connect the following envs: ${missingEnvs.join(", ")}` },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { userId, days } = parsed.data;
  try {
    const account = await getGmailConnection(userId);
    if (!account || account.status !== "ACTIVE") {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 409 });
    }
    const emails = await fetchInvoiceEmails(userId, days ?? config.finance.defaultDays);
    const report = await analyzeInvoices(emails);
    if (dbConfigured() && sql) {
      try {
        await ensureSchema();
        const id = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
        await sql`
          INSERT INTO finance_scans (id, user_id, report)
          VALUES (${id}, ${userId}, ${JSON.stringify(report)})
        `;
      } catch (err) {
        console.error("Failed to store finance scan:", err);
      }
    }
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
