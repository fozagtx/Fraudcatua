import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: {
      speechmatics: Boolean(process.env.SPEECHMATICS_API_KEY),
      neonGateway: Boolean(
        process.env.NEON_AI_GATEWAY_BASE_URL && process.env.NEON_AI_GATEWAY_TOKEN,
      ),
      firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
      database: Boolean(process.env.DATABASE_URL),
    },
  });
}
