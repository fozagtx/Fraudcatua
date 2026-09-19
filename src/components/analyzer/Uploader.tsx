"use client";

import { useRef, useState } from "react";
import { fmtSize } from "./format";

export function Uploader({
  file,
  onFile,
  disabled,
}: {
  file: File | null;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`rounded-card border border-dashed p-8 text-center transition-colors ${
        dragging ? "border-coral bg-stone" : "border-hairline bg-stone"
      } ${disabled ? "opacity-60" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !disabled) onFile(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.m4a,.mp4,.wav,.ogg,.webm,.aac,.flac,.amr,.3gp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {file ? (
        <div>
          <p className="font-medium">{file.name}</p>
          <p className="mono-label mt-1 text-muted">
            {fmtSize(file.size)} · {file.type || "audio/video"}
          </p>
          <button
            type="button"
            className="btn-pill btn-secondary mt-4"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Choose a different file
          </button>
        </div>
      ) : (
        <div>
          <p className="font-display text-lg">Drop a call recording here</p>
          <p className="mt-1 text-sm text-muted">
            Audio or video, up to 25 MB: mp3, m4a, wav, ogg, mp4…
          </p>
          <button
            type="button"
            className="btn-pill btn-secondary mt-4"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Browse files
          </button>
        </div>
      )}
    </div>
  );
}
