import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { setInput, setMicrophoneMute, setMicrophoneVolume } from "./controls";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
const call = vi.mocked(invoke);
beforeEach(() => call.mockReset());

describe("microphone commands", () => {
  it("keeps the final slider write and mute ordered while Windows is busy", async () => {
    let finish!: () => void;
    call.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    call.mockResolvedValue(undefined);
    const first = setMicrophoneVolume("usb-mic", 20);
    const last = setMicrophoneVolume("usb-mic", 75);
    const mute = setMicrophoneMute("usb-mic", true);
    await Promise.resolve();
    expect(call).toHaveBeenCalledTimes(1);
    finish();
    await Promise.all([first, last, mute]);
    expect(call.mock.calls).toEqual([
      ["controls_set_microphone_volume", { id: "usb-mic", level: 20 }],
      ["controls_set_microphone_volume", { id: "usb-mic", level: 75 }],
      ["controls_set_microphone_mute", { id: "usb-mic", muted: true }],
    ]);
  });

  it("reports device failures and permits the next device to be controlled", async () => {
    call.mockRejectedValueOnce(new Error("disconnected"));
    await expect(setMicrophoneMute("removed", true)).rejects.toThrow("disconnected");
    call.mockResolvedValue(undefined);
    await expect(setMicrophoneMute("new-mic", false)).resolves.toBeUndefined();
    expect(call).toHaveBeenLastCalledWith("controls_set_microphone_mute", { id: "new-mic", muted: false });
  });

  it("passes the selected capture endpoint id to Windows", async () => {
    call.mockResolvedValue(undefined);
    await setInput("headset-mic");
    expect(call).toHaveBeenCalledWith("controls_set_input", { id: "headset-mic" });
  });
});
