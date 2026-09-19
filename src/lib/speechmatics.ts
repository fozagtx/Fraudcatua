import { BatchClient } from "@speechmatics/batch-client";
import type { TranscriptSegment, TranscriptWord } from "./types";

const GAP_BREAK_S = 1.2;
const EOS_PUNCT = /^[.!?…]+$/;

type RawResult = {
  type?: string;
  start_time?: number;
  end_time?: number;
  is_eos?: boolean;
  attaches_to?: string;
  alternatives?: { content?: string; speaker?: string }[];
};

/**
 * Group flat Speechmatics results into speaker utterances. Breaks on speaker
 * change, a >1.2s gap, or end-of-sentence punctuation.
 */
export function toSegments(results: RawResult[]): TranscriptSegment[] {
  type Word = TranscriptWord & { speaker: string; punct: boolean };
  const words: Word[] = [];

  let lastSpeaker = "S1";
  for (const r of results) {
    const alt = r.alternatives?.[0];
    const content = alt?.content;
    if (!content) continue;
    if (alt?.speaker) lastSpeaker = alt.speaker;
    if (r.type === "punctuation" || r.attaches_to === "previous") {
      const prev = words[words.length - 1];
      if (prev) {
        prev.w += content;
        prev.end = r.end_time ?? prev.end;
        if (EOS_PUNCT.test(content) || r.is_eos) prev.punct = true;
      }
      continue;
    }
    words.push({
      w: content,
      start: r.start_time ?? 0,
      end: r.end_time ?? 0,
      speaker: lastSpeaker,
      punct: false,
    });
  }

  const segments: TranscriptSegment[] = [];
  let cur: Word[] = [];
  let nextId = 1;

  const flush = () => {
    if (cur.length === 0) return;
    segments.push({
      id: nextId++,
      speaker: cur[0].speaker,
      start: cur[0].start,
      end: cur[cur.length - 1].end,
      text: cur.map((w) => w.w).join(" ").replace(/\s+([,.!?;:%])/g, "$1"),
      words: cur.map(({ w, start, end }) => ({ w, start, end })),
    });
    cur = [];
  };

  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (
      prev &&
      (w.speaker !== prev.speaker ||
        w.start - prev.end > GAP_BREAK_S ||
        prev.punct)
    ) {
      flush();
    }
    cur.push(w);
  }
  flush();
  return segments;
}

export async function transcribeFile(
  file: File,
): Promise<{ segments: TranscriptSegment[]; durationS: number }> {
  const apiKey = process.env.SPEECHMATICS_API_KEY;
  if (!apiKey) {
    throw new Error("Connect the following envs: SPEECHMATICS_API_KEY");
  }
  const client = new BatchClient({ apiKey, appId: "fraudcatua" });
  const res = await client.transcribe(
    file,
    {
      transcription_config: {
        language: process.env.SPEECHMATICS_LANGUAGE ?? "en",
        operating_point: "enhanced",
        diarization: "speaker",
      },
    },
    "json-v2",
  );
  const typed = res as { results: RawResult[]; job?: { duration?: number } };
  const segments = toSegments(typed.results ?? []);
  const last = segments[segments.length - 1];
  return {
    segments,
    durationS: typed.job?.duration ?? last?.end ?? 0,
  };
}
