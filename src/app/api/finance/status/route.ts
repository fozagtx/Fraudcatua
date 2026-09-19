import { NextRequest, NextResponse } from "next/server";
import { getGmailConnection } from "@/lib/finance/composio";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!process.env.COMPOSIO_API_KEY) {
    return NextResponse.json(
      { error: "Connect the following envs: COMPOSIO_API_KEY" },
      { status: 500 },
    );
  }
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing ?userId=" }, { status: 400 });
  }
  try {
    const account = await getGmailConnection(userId);
    return NextResponse.json({
      connected: Boolean(account && account.status === "ACTIVE"),
      account: account ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
