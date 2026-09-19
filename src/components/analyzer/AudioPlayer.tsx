"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { fmtTime } from "./format";

export type AudioPlayerHandle = {
  seekTo: (t: number) => void;
  playRange: (start: number, end: number) => void;
};

export const AudioPlayer = forwardRef<
  AudioPlayerHandle,
  { src: string; onTimeUpdate: (t: number) => void }
>(function AudioPlayer({ src, onTimeUpdate }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const rangeEndRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    seekTo(t) {
      const a = audioRef.current;
      if (!a) return;
      rangeEndRef.current = null;
      a.currentTime = t;
    },
    playRange(start, end) {
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = start;
      rangeEndRef.current = end;
      void a.play();
    },
  }));

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = rate;
  }, [rate]);

  return (
    <div className="rounded-card bg-stone p-5">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setTime(t);
          onTimeUpdate(t);
          if (rangeEndRef.current != null && t >= rangeEndRef.current) {
            rangeEndRef.current = null;
            e.currentTarget.pause();
          }
        }}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-pill btn-primary"
          onClick={() => {
            const a = audioRef.current;
            if (!a) return;
            if (a.paused) void a.play();
            else a.pause();
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <span className="mono-label tabular text-muted">
          {fmtTime(time)} / {fmtTime(duration)}
        </span>
        <button
          type="button"
          className="mono-label ml-auto text-muted hover:text-ink transition-colors"
          onClick={() => setRate(rate === 1 ? 1.5 : 1)}
        >
          {rate}x
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={time}
        onChange={(e) => {
          const t = Number(e.target.value);
          if (audioRef.current) audioRef.current.currentTime = t;
          setTime(t);
        }}
        className="mt-3 w-full accent-[#17171c]"
        aria-label="Seek"
      />
    </div>
  );
});
