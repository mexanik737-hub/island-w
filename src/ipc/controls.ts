import { invoke } from "@tauri-apps/api/core";

export type RadioKind = "wifi" | "bluetooth";

/** Mirrors `Controls` in `src-tauri/src/controls.rs`. */
export interface Controls {
  radios: { kind: RadioKind; on: boolean }[];
  outputs: { id: string; name: string; form: "headphones" | "headset" | "speakers" | "other"; default: boolean }[];
  inputs: Controls["outputs"];
  microphone: { id: string; level: number; muted: boolean } | null;
  volume: { level: number; muted: boolean } | null;
  apps: { key: string; name: string; icon: string; level: number; muted: boolean }[];
}

export const getControls = () => invoke<Controls>("controls_state");
export const setRadio = (kind: RadioKind, on: boolean) => invoke<void>("controls_set_radio", { kind, on });
export const setOutput = (id: string) => invoke<void>("controls_set_output", { id });
export const setVolume = (level: number) => invoke<void>("controls_set_volume", { level });
export const setMute = (muted: boolean) => invoke<void>("controls_set_mute", { muted });
export const setAppVolume = (key: string, level: number) => invoke<void>("controls_set_app_volume", { key, level });
export const setAppMute = (key: string, muted: boolean) => invoke<void>("controls_set_app_mute", { key, muted });

export type PowerAction = "lock" | "sleep" | "restart" | "shutdown";
export const runPowerAction = (action: PowerAction) => invoke<void>("controls_power_action", { action });

export const setInput = (id: string) => invoke<void>("controls_set_input", { id });
// Keep the final drag value and subsequent mute in order even when native calls
// take longer than a slider's send interval. A failed device must not block retry.
let microphoneWrite: Promise<void> = Promise.resolve();
function writeMicrophone(command: string, args: Record<string, unknown>): Promise<void> {
  const next = microphoneWrite.then(() => invoke<void>(command, args));
  microphoneWrite = next.catch(() => {});
  return next;
}
export const setMicrophoneVolume = (id: string, level: number) => writeMicrophone("controls_set_microphone_volume", { id, level });
export const setMicrophoneMute = (id: string, muted: boolean) => writeMicrophone("controls_set_microphone_mute", { id, muted });
