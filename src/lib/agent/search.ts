import Firecrawl from "firecrawl";
import { config } from "../../config";

export type WebHit = { title: string; url: string; description: string };

export type SearchOutcome = { hits: WebHit[]; error?: string };

const TIMEOUT_MS = 8000;

export async function webSearch(query: string): Promise<SearchOutcome> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return { hits: [], error: "Connect the following envs: FIRECRAWL_API_KEY" };
  }
  try {
    const firecrawl = new Firecrawl({ apiKey, apiUrl: config.firecrawl.apiUrl });
    const result = await Promise.race([
      firecrawl.search(query, { limit: 4 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("search timed out")), TIMEOUT_MS),
      ),
    ]);
    const hits: WebHit[] = (result.web ?? [])
      .filter(
        (r): r is { url: string; title?: string; description?: string } =>
          typeof r === "object" && r !== null && "url" in r && typeof r.url === "string",
      )
      .map((r) => ({
        title: r.title ?? r.url,
        url: r.url,
        description: "description" in r && typeof r.description === "string" ? r.description : "",
      }));
    return { hits };
  } catch (err) {
    return { hits: [], error: err instanceof Error ? err.message : "search failed" };
  }
}
