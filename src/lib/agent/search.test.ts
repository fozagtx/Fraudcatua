import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, type SearchProvider } from "../../config";
import { webSearch } from "./search";
import { analyzeTranscript } from "./analyze";

const { firecrawlSearch, firecrawlConstructor, askJson } = vi.hoisted(() => ({
  firecrawlSearch: vi.fn(),
  firecrawlConstructor: vi.fn(),
  askJson: vi.fn(),
}));
vi.mock("firecrawl", () => ({
  default: class {
    constructor(options: unknown) { firecrawlConstructor(options); }
    search = firecrawlSearch;
  },
}));
vi.mock("./llm", () => ({ askJson, MODEL_ID: "scripted-test-model" }));
vi.mock("../db", () => ({ sql: null, ensureSchema: vi.fn() }));

type ObservedRequest = { url: string; headers: Headers; body: Record<string, unknown>; signal?: AbortSignal | null };
let requests: ObservedRequest[];
let toolResult: Record<string, unknown>;
let blockMethod: string | undefined;
let httpStatus: number;
const hit = { title: "MTN support", url: "https://mtn.com.gh/help?source=official#contact", excerpts: ["Call 100 for help.", "Never share an OTP."] };

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("FIRECRAWL_API_KEY", "");
  // Ambient Parallel credentials must never turn anonymous searches into paid requests.
  vi.stubEnv("PARALLEL_API_KEY", "ambient-key-must-not-be-sent");
  Object.assign(config.search, { provider: "auto" satisfies SearchProvider });
  requests = [];
  blockMethod = undefined;
  httpStatus = 200;
  toolResult = { content: [], structuredContent: { results: [hit] } };
  firecrawlSearch.mockResolvedValue({ web: [{ title: "Existing provider", url: "https://example.org", description: "Existing evidence" }] });
  vi.stubGlobal("fetch", vi.fn(async (url: URL | string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : {};
    requests.push({ url: String(url), headers: new Headers(init.headers), body, signal: init.signal });
    if (init.method === "GET") return new Response(null, { status: 405 });
    if (body.method === blockMethod) {
      return new Promise<Response>((_, reject) => {
        if (init.signal?.aborted) reject(init.signal.reason);
        else init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      });
    }
    if (body.method === "initialize") return jsonResponse({ jsonrpc: "2.0", id: body.id, result: {
      protocolVersion: body.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "Fixture", version: "1.0" },
    } });
    if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
    if (body.method === "notifications/cancelled") return new Response(null, { status: 202 });
    if (body.method === "tools/list") return jsonResponse({ jsonrpc: "2.0", id: body.id, result: { tools: [{
      name: "web_search", inputSchema: { type: "object", properties: { objective: { type: "string" }, search_queries: { type: "array", items: { type: "string" } } }, required: ["objective", "search_queries"] },
    }] } });
    if (body.method === "tools/call") {
      if (httpStatus !== 200) return new Response("search service unavailable", { status: httpStatus });
      return jsonResponse({ jsonrpc: "2.0", id: body.id, result: toolResult });
    }
    throw new Error(`Unexpected MCP request: ${body.method}`);
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  Object.assign(config.search, { provider: "auto" });
});

function calls() {
  return requests.filter((r) => r.body.method === "tools/call").map((r) => r.body.params as { name: string; arguments: Record<string, unknown> });
}

function expectAnonymousRequests() {
  expect(requests.length).toBeGreaterThan(2);
  for (const request of requests) {
    expect(request.url).toBe("https://search.parallel.ai/mcp");
    expect(request.headers.get("user-agent")).toBe("Fraudcatua/0.1.0 (+https://github.com/fozagtx/Fraudcatua)");
    expect(request.headers.has("authorization")).toBe(false);
  }
}

describe("webSearch provider resolution and MCP transport", () => {
  it("uses anonymous MCP for fresh configuration and preserves source URLs/excerpts", async () => {
    expect(await webSearch("MTN Ghana support", { sessionId: "test-analysis-session" })).toEqual({ hits: [{
      title: hit.title, url: hit.url, description: hit.excerpts.join("\n"),
    }] });
    expectAnonymousRequests();
    expect(calls()).toEqual([{ name: "web_search", arguments: { objective: "MTN Ghana support", search_queries: ["MTN Ghana support"], session_id: "test-analysis-session", model_name: config.model } }]);
    expect(firecrawlSearch).not.toHaveBeenCalled();
  });

  it("keeps configured Firecrawl credentials and its configured endpoint", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "saved-firecrawl-key");
    expect((await webSearch("claim")).hits[0].title).toBe("Existing provider");
    expect(firecrawlConstructor).toHaveBeenCalledWith({ apiKey: "saved-firecrawl-key", apiUrl: config.firecrawl.apiUrl });
    expect(firecrawlSearch).toHaveBeenCalledWith("claim", { limit: 4 });
    expect(requests).toEqual([]);
  });

  it("honors explicit Parallel selection even when a Firecrawl key exists", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "saved-firecrawl-key");
    Object.assign(config.search, { provider: "parallel" });
    expect((await webSearch("claim")).hits).toHaveLength(1);
    expect(firecrawlSearch).not.toHaveBeenCalled();
    expectAnonymousRequests();
  });

  it("does not fall back when Firecrawl is explicitly selected without a key", async () => {
    Object.assign(config.search, { provider: "firecrawl" });
    expect(await webSearch("claim")).toEqual({ hits: [], error: "Connect the following envs: FIRECRAWL_API_KEY" });
    expect(requests).toEqual([]);
  });

  it("does not fall back after configured Firecrawl fails", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "saved-firecrawl-key");
    firecrawlSearch.mockRejectedValue(new Error("provider rejected key"));
    expect(await webSearch("claim")).toEqual({ hits: [], error: "provider rejected key" });
    expect(requests).toEqual([]);
  });

  it("honors disabled search without any external calls", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "saved-firecrawl-key");
    Object.assign(config.search, { provider: "disabled" });
    expect(await webSearch("claim")).toEqual({ hits: [] });
    expect(requests).toEqual([]);
    expect(firecrawlSearch).not.toHaveBeenCalled();
  });

  it("accepts MCP text JSON and filters unsafe URLs before applying the four-hit cap", async () => {
    toolResult = { content: [{ type: "text", text: JSON.stringify({ results: [
      { ...hit, url: "javascript:alert(1)" }, { ...hit, url: "https://user:pass@example.org" },
      ...Array.from({ length: 5 }, (_, i) => ({ ...hit, title: null, url: `https://example.org/${i}` })),
    ] }) }] };
    const result = await webSearch("claim");
    expect(result.hits).toHaveLength(4);
    expect(result.hits[0]).toMatchObject({ title: "https://example.org/0", url: "https://example.org/0" });
  });

  it.each([
    { content: [{ type: "text", text: "quota exceeded" }], isError: true },
    { content: [{ type: "text", text: "invalid JSON" }] },
    { content: [], structuredContent: { results: [{ url: "https://example.org", excerpts: "wrong type" }] } },
  ])("returns no evidence for MCP tool or malformed response errors: %j", async (result) => {
    toolResult = result;
    const outcome = await webSearch("claim");
    expect(outcome.hits).toEqual([]);
    expect(outcome.error).toBeTruthy();
    expect(firecrawlSearch).not.toHaveBeenCalled();
  });

  it("surfaces HTTP errors without switching providers", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "saved-firecrawl-key");
    Object.assign(config.search, { provider: "parallel" });
    httpStatus = 503;
    const result = await webSearch("claim");
    expect(result.hits).toEqual([]);
    expect(result.error).toContain("search service unavailable");
    expect(firecrawlSearch).not.toHaveBeenCalled();
  });

  it.each(["initialize", "tools/list", "tools/call"])("bounds %s by the search deadline and aborts its HTTP request", async (method) => {
    vi.useFakeTimers();
    blockMethod = method;
    const pending = webSearch("claim");
    await vi.advanceTimersByTimeAsync(0);
    expect(requests.some((r) => r.body.method === method)).toBe(true);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await pending).toEqual({ hits: [], error: "search timed out" });
    expect(requests.find((r) => r.body.method === method)?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels an active MCP request and releases timers", async () => {
    vi.useFakeTimers();
    blockMethod = "tools/call";
    const controller = new AbortController();
    const pending = webSearch("claim", { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    expect(await pending).toEqual({ hits: [], error: "search cancelled" });
    expect(requests.find((r) => r.body.method === "tools/call")?.signal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not contact a provider when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(await webSearch("claim", { signal: controller.signal })).toEqual({ hits: [], error: "search cancelled" });
    expect(requests).toEqual([]);
    expect(firecrawlSearch).not.toHaveBeenCalled();
  });
});

const extraction = {
  summary: "Caller asks for a code", impersonatedService: "MTN", scamType: "otp_theft", claims: [{ text: "MTN asks for OTP codes", segmentIds: [1] }],
  redFlags: [], numbersMentioned: [], askedForCode: true, urgencyPressure: false,
};
const verdict = {
  verdict: "scam", confidence: 95, headline: "Do not share your code", explanation: "Official evidence contradicts the caller", evidence: [],
  claimChecks: [{ claim: extraction.claims[0].text, status: "false", finding: "Never share an OTP.", sources: [{ title: hit.title, url: hit.url }] }],
  supportNumbers: [{ service: "MTN", number: "100", note: "Official support" }], whatToDo: ["Hang up", "Keep your code private", "Contact support"],
};

describe("actual analyzeTranscript caller with a scripted model", () => {
  it("passes anonymous claim/support evidence to the judge and returns its citations", async () => {
    askJson.mockResolvedValueOnce(extraction).mockResolvedValueOnce(verdict);
    const result = await analyzeTranscript([{ id: 1, speaker: "Caller", start: 0, end: 1, text: "Read me your code", words: [] }]);
    expect(calls()).toHaveLength(2);
    expect(calls()[0].arguments.objective).toBe("MTN asks for OTP codes MTN Ghana scam");
    expect(calls()[1].arguments.objective).toBe("MTN official customer care number Ghana");
    expect(calls()[0].arguments.session_id).toBe(calls()[1].arguments.session_id);
    expect(String(calls()[0].arguments.session_id)).toMatch(/^[a-f0-9-]{36}$/);
    const prompt = askJson.mock.calls[1][2];
    expect(prompt.match(/MTN support/g)).toHaveLength(2);
    expect(prompt).toContain(hit.url);
    expect(prompt).toContain("Call 100 for help.");
    expect(result.claimChecks[0].sources[0].url).toBe(hit.url);
    expect(result.supportNumbers[0].number).toBe("100");
    expectAnonymousRequests();
  });

  it("keeps failed searches out of evidence supplied to the judge", async () => {
    toolResult = { content: [{ type: "text", text: "quota exceeded" }], isError: true };
    askJson.mockResolvedValueOnce(extraction).mockResolvedValueOnce({ ...verdict, claimChecks: [], supportNumbers: [] });
    const result = await analyzeTranscript([]);
    expect(askJson.mock.calls[1][2]).toContain("(no results)");
    expect(askJson.mock.calls[1][2]).not.toContain("quota exceeded");
    expect(result.supportNumbers).toEqual([]);
  });

  it("skips claim and support requests when search is disabled", async () => {
    Object.assign(config.search, { provider: "disabled" });
    askJson.mockResolvedValueOnce(extraction).mockResolvedValueOnce({ ...verdict, claimChecks: [], supportNumbers: [] });
    await analyzeTranscript([]);
    expect(requests).toEqual([]);
    expect(firecrawlSearch).not.toHaveBeenCalled();
    expect(askJson.mock.calls[1][2]).toContain("(no results)");
  });

  it("does not search or judge after cancellation during extraction", async () => {
    const controller = new AbortController();
    askJson.mockImplementationOnce(async () => { controller.abort(); return extraction; });
    await expect(analyzeTranscript([], controller.signal)).rejects.toThrow();
    expect(askJson).toHaveBeenCalledTimes(1);
    expect(requests).toEqual([]);
  });
});
