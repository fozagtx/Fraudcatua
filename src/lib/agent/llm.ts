import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject, generateText } from "ai";
import type { ZodType } from "zod";

import { config } from "../../config";

export const MODEL_ID = config.model;

export function missingGatewayEnvs(): string[] {
  return process.env.NEBIUS_API_KEY ? [] : ["NEBIUS_API_KEY"];
}

function requireGateway(): void {
  const missing = missingGatewayEnvs();
  if (missing.length > 0) {
    throw new Error(`Connect the following envs: ${missing.join(", ")}`);
  }
}

function model() {
  requireGateway();
  const nebius = createOpenAICompatible({
    name: "nebius",
    baseURL: config.nebius.apiUrl,
    apiKey: process.env.NEBIUS_API_KEY!,
  });
  return nebius.chatModel(config.model);
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
