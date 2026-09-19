export const config = {
  model: "openai/gpt-oss-120b",
  // Nebius Token Factory endpoint (OpenAI-compatible).
  nebius: { apiUrl: "https://api.tokenfactory.nebius.com/v1" },
  speechmatics: { apiUrl: "https://asr.api.speechmatics.com/v2", language: "en" },
  firecrawl: { apiUrl: "https://api.firecrawl.dev" },
  mascot: {
    directions: "/mascots/afro-directions.webp",
    reactions: "/mascots/afro-reactions.webp",
  },
} as const;
