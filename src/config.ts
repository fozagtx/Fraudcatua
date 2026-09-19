export const config = {
  model: "gpt-oss-120b",
  // Neon AI Gateway branch endpoint (Neon Console → branch → AI Gateway). No trailing /v1.
  neonGatewayBaseUrl: process.env.NEON_AI_GATEWAY_BASE_URL ?? "",
  speechmatics: { apiUrl: "https://asr.api.speechmatics.com/v2", language: "en" },
  firecrawl: { apiUrl: "https://api.firecrawl.dev" },
  mascot: {
    directions: "/mascots/afro-directions.webp",
    reactions: "/mascots/afro-reactions.webp",
  },
} as const;
