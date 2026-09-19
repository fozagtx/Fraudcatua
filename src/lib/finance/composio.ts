import { Composio } from "@composio/core";
import { z } from "zod";
import { config } from "../../config";
import type { InvoiceEmail } from "./types";

const ENV_MSG = "Connect the following envs: COMPOSIO_API_KEY";

export function composioClient(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error(ENV_MSG);
  return new Composio({ apiKey });
}

export async function getGmailConnection(
  userId: string,
): Promise<{ id: string; status: string } | null> {
  const composio = composioClient();
  const res = await composio.connectedAccounts.list({
    userIds: [userId],
    toolkitSlugs: ["gmail"],
  });
  const items = (res as { items?: { id?: string; status?: string }[] }).items ?? [];
  const active = items.find((a) => a.status === "ACTIVE") ?? items[0];
  if (!active?.id) return null;
  return { id: active.id, status: active.status ?? "UNKNOWN" };
}

export async function startGmailConnect(
  userId: string,
  callbackUrl: string,
): Promise<{ redirectUrl: string }> {
  const composio = composioClient();
  const req = await composio.toolkits.authorize(userId, "gmail");
  const redirectUrl = (req as { redirectUrl?: string }).redirectUrl;
  if (!redirectUrl) throw new Error("Composio did not return a redirect URL");
  const url = new URL(redirectUrl);
  url.searchParams.set("redirect_url", callbackUrl);
  return { redirectUrl: url.toString() };
}

const messageSchema = z
  .object({
    messageId: z.string().optional(),
    id: z.string().optional(),
    sender: z.string().optional(),
    from: z.string().optional(),
    subject: z.string().optional(),
    messageTimestamp: z.string().optional(),
    date: z.string().optional(),
    preview: z.string().optional(),
    snippet: z.string().optional(),
    messageText: z.string().optional(),
    body: z.string().optional(),
  })
  .passthrough();

const responseSchema = z.object({
  data: z
    .object({
      messages: z.array(messageSchema).optional(),
      response_data: z
        .object({ messages: z.array(messageSchema).optional() })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

export async function fetchInvoiceEmails(
  userId: string,
  days: number,
): Promise<InvoiceEmail[]> {
  const composio = composioClient();
  const res = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
    userId,
    arguments: {
      query: `(invoice OR receipt OR "payment due" OR "amount due") newer_than:${days}d`,
      max_results: config.finance.maxEmails,
    },
    dangerouslySkipVersionCheck: true,
  });
  const parsed = responseSchema.safeParse(res);
  const messages =
    (parsed.success
      ? parsed.data.data?.messages ?? parsed.data.data?.response_data?.messages
      : undefined) ?? [];
  return messages.map((m, i) => ({
    id: m.messageId ?? m.id ?? `msg-${i}`,
    from: m.sender ?? m.from ?? "",
    subject: m.subject ?? "",
    date: m.messageTimestamp ?? m.date ?? "",
    snippet: m.preview ?? m.snippet ?? "",
    body: (m.messageText ?? m.body ?? m.preview ?? "").slice(0, 4000),
  }));
}
