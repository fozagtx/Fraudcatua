import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startGmailConnect } from "@/lib/finance/composio";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  userId: z.string().min(1),
  returnTo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!process.env.COMPOSIO_API_KEY) {
    return NextResponse.json(
      { error: "Connect the following envs: COMPOSIO_API_KEY" },
      { status: 500 },
    );
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const callbackUrl =
      parsed.data.returnTo ?? new URL("/finance", req.nextUrl.origin).toString();
    const { redirectUrl } = await startGmailConnect(parsed.data.userId, callbackUrl);
    return NextResponse.json({ redirectUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connect failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
