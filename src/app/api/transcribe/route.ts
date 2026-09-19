import { NextRequest, NextResponse } from "next/server";
import { transcribeFile } from "@/lib/speechmatics";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!process.env.SPEECHMATICS_API_KEY) {
    return NextResponse.json(
      { error: "Connect the following envs: SPEECHMATICS_API_KEY" },
      { status: 500 },
    );
  }
  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 25 MB" }, { status: 413 });
  }
  const okType =
    file.type.startsWith("audio/") ||
    file.type.startsWith("video/") ||
    /\.(mp3|m4a|mp4|wav|ogg|oga|webm|aac|flac|amr|3gp)$/i.test(file.name);
  if (!okType) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload an audio or video recording" },
      { status: 415 },
    );
  }
  try {
    const { segments, durationS } = await transcribeFile(file);
    return NextResponse.json({ segments, durationS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
