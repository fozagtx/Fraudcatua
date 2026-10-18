import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import Firecrawl from "firecrawl";
import { z } from "zod";
import { config } from "../../config";

export type WebHit = { title: string; url: string; description: string };
export type SearchOutcome = { hits: WebHit[]; error?: string };
type SearchOptions = { signal?: AbortSignal; sessionId?: string };

const TIMEOUT_MS = 8000;
const USER_AGENT = "Fraudcatua/0.1.0 (+https://github.com/fozagtx/Fraudcatua)";
const parallelResults = z.object({
  results: z.array(z.object({
    url: z.string(),
    title: z.string().nullable().optional(),
    excerpts: z.array(z.string()),
  })),
});

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function parallelSearch(query: string, signal: AbortSignal, sessionId: string): Promise<WebHit[]> {
  const client = new Client({ name: "Fraudcatua", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(config.search.parallelMcpUrl), {
    requestInit: { headers: { "User-Agent": USER_AGENT } },
    // Include discovery and SSE requests in the same deadline/cancellation scope.
    fetch: (url, init) => fetch(url, {
      ...init,
      cache: "no-store",
      signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal,
    }),
  });
  try {
    await client.connect(transport, { signal });
    const tools = await client.listTools({}, { signal });
    if (!tools.tools.some((tool) => tool.name === "web_search")) {
      throw new Error("Parallel MCP does not offer web_search");
    }
    const result = CallToolResultSchema.parse(await client.callTool({
      name: "web_search",
      arguments: {
        objective: query,
        search_queries: [query],
        session_id: sessionId,
        model_name: config.model,
      },
    }, undefined, { signal }));
    if (result.isError) {
      throw new Error(result.content.filter((c) => c.type === "text").map((c) => c.text).join("\n") || "Parallel search failed");
    }
    const text = result.content.find((c) => c.type === "text");
    const data = parallelResults.parse(result.structuredContent ?? JSON.parse(text?.text ?? "null"));
    return data.results.filter((r) => isWebUrl(r.url)).slice(0, 4).map((r) => ({
      title: r.title || r.url,
      url: r.url,
      description: r.excerpts.join("\n"),
    }));
  } finally {
    await client.close();
  }
}

async function firecrawlSearch(query: string): Promise<WebHit[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("Connect the following envs: FIRECRAWL_API_KEY");
  const firecrawl = new Firecrawl({ apiKey, apiUrl: config.firecrawl.apiUrl });
  const result = await firecrawl.search(query, { limit: 4 });
  return (result.web ?? [])
    .filter(
      (r): r is { url: string; title?: string; description?: string } =>
        typeof r === "object" && r !== null && "url" in r && typeof r.url === "string" && isWebUrl(r.url),
    )
    .slice(0, 4)
    .map((r) => ({
      title: r.title ?? r.url,
      url: r.url,
      description: "description" in r && typeof r.description === "string" ? r.description : "",
    }));
}

export async function webSearch(query: string, options: SearchOptions = {}): Promise<SearchOutcome> {
  const provider = config.search.provider === "auto"
    ? (process.env.FIRECRAWL_API_KEY ? "firecrawl" : "parallel")
    : config.search.provider;
  if (provider === "disabled") return { hits: [] };
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("search cancelled"));
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => controller.abort(new Error("search timed out")), TIMEOUT_MS);
  let onAbort: () => void = () => {};
  try {
    controller.signal.throwIfAborted();
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", onAbort, { once: true });
    });
    const search = provider === "parallel"
      ? parallelSearch(query, controller.signal, options.sessionId ?? crypto.randomUUID())
      : firecrawlSearch(query);
    return { hits: await Promise.race([search, aborted]) };
  } catch (err) {
    return { hits: [], error: err instanceof Error ? err.message : "search failed" };
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener("abort", onAbort);
    options.signal?.removeEventListener("abort", cancel);
  }
}
