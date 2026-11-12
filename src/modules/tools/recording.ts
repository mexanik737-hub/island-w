import { useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

export type RecordingPhase = "idle" | "starting" | "active" | "stopping" | "error";

export interface RecordingState {
  phase: RecordingPhase;
  selecting: boolean;
  elapsedSeconds: number;
  stream: MediaStream | null;
  error: string | null;
}

const initial: RecordingState = { phase: "idle", selecting: false, elapsedSeconds: 0, stream: null, error: null };
let state = initial;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let startedAt = 0;
let clock: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function publish(next: RecordingState) {
  state = next;
  for (const listener of listeners) listener();
}

function saveRecording(blob: Blob) {
  if (!blob.size) return;
  const type = blob.type || "video/webm";
  const extension = type.includes("mp4") ? "mp4" : "webm";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Island-W-recording-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function clearClock() {
  if (clock !== null) clearInterval(clock);
  clock = null;
}

export const recording = {
  getSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async chooseScreen(): Promise<MediaStream | null> {
    if (state.phase === "starting" || state.phase === "active" || state.phase === "stopping") return state.stream;
    if (state.selecting) return state.stream;
    publish({ ...state, selecting: true, error: null });
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack?.addEventListener("ended", () => {
        if (recorder?.state === "recording") recording.stop();
        publish({ ...state, stream: null });
      }, { once: true });
      publish({ ...state, phase: "idle", selecting: false, stream, error: null });
      return stream;
    } catch (error) {
      const cancelled = error instanceof DOMException && error.name === "NotAllowedError";
      publish({ ...state, phase: cancelled ? "idle" : "error", selecting: false, error: cancelled ? null : String(error) });
      return null;
    }
  },
  start() {
    if (state.phase === "starting" || state.phase === "active" || state.phase === "stopping") return;
    const stream = state.stream;
    if (!stream) {
      publish({ ...state, phase: "error", error: "Choose a screen first." });
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      publish({ ...state, phase: "error", error: "Screen recording is unavailable." });
      return;
    }
    publish({ ...state, phase: "starting", elapsedSeconds: 0, error: null });
    const mimeType = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    try {
      const next = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];
      next.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      next.onstart = () => {
        startedAt = Date.now();
        publish({ ...state, phase: "active", error: null });
        clearClock();
        clock = setInterval(() => publish({ ...state, elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000) }), 1000);
      };
      next.onstop = () => {
        clearClock();
        const type = next.mimeType || "video/webm";
        saveRecording(new Blob(chunks, { type }));
        chunks = [];
        recorder = null;
        publish({ ...state, phase: "idle", elapsedSeconds: 0, error: null });
        invoke("recording_finished").catch(() => {});
      };
      next.onerror = () => {
        clearClock();
        chunks = [];
        recorder = null;
        publish({ ...state, phase: "error", error: "The screen recording failed." });
        invoke("recording_finished").catch(() => {});
      };
      recorder = next;
      next.start(1000);
    } catch (error) {
      recorder = null;
      publish({ ...state, phase: "error", error: String(error) });
    }
  },
  stop() {
    if (state.phase === "stopping" || state.phase === "idle" || state.phase === "error") return;
    if (recorder?.state === "recording") {
      publish({ ...state, phase: "stopping" });
      clearClock();
      try { recorder.stop(); } catch (error) { publish({ ...state, phase: "error", error: String(error) }); }
    } else {
      publish({ ...state, phase: "idle", elapsedSeconds: 0 });
    }
  },
  stopScreen() {
    recording.stop();
    state.stream?.getTracks().forEach((track) => track.stop());
    publish({ ...state, stream: null });
  },
};

// The process belongs to this module for the whole app session, not the view.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    recording.stop();
    state.stream?.getTracks().forEach((track) => track.stop());
  });
}

export function useRecordingState(): RecordingState {
  return useSyncExternalStore(recording.subscribe, recording.getSnapshot, recording.getSnapshot);
}
