import { createNeon } from "@neondatabase/ai-sdk-provider";
import { generateObject, generateText } from "ai";
import type { ZodType } from "zod";

export const MODEL_ID = process.env.FRAUDCATUA_MODEL ?? "gpt-oss-120b";

function requireGateway(): void {
  if (!process.env.NEON_AI_GATEWAY_BASE_URL) {
    throw new Error("NEON_AI_GATEWAY_BASE_URL is not set");
  }
  if (!process.env.NEON_AI_GATEWAY_TOKEN) {
    throw new Error("NEON_AI_GATEWAY_TOKEN is not set");
  }
}

function model() {
  requireGateway();
  const neon = createNeon({
    baseURL: process.env.NEON_AI_GATEWAY_BASE_URL,
    apiKey: process.env.NEON_AI_GATEWAY_TOKEN,
  });
  return neon(MODEL_ID);
}

function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON");
  }
  return candidate.slice(start, end + 1);
}

/**
 * Ask the model for a JSON value matching `schema`. Tries structured output
 * via generateObject first, then falls back to generateText + JSON parsing,
 * since some open-weight models on the gateway can't do structured output.
 */
export async function askJson<T>(
  schema: ZodType<T>,
  system: string,
  prompt: string,
): Promise<T> {
  const m = model();
  try {
    const { object } = await generateObject({
      model: m,
      schema,
      system,
      prompt,
    });
    return schema.parse(object);
  } catch {
    const { text } = await generateText({
      model: m,
      system: `${system}\n\nRespond with a single JSON object only. No markdown, no commentary.`,
      prompt,
    });
    return schema.parse(JSON.parse(extractJson(text)));
  }
}
