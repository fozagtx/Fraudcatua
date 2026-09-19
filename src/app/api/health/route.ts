import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: {
      speechmatics: Boolean(process.env.SPEECHMATICS_API_KEY),
      nebius: Boolean(process.env.NEBIUS_API_KEY),
      firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
      database: Boolean(process.env.DATABASE_URL),
    },
  });
}
