import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("screen recording controller", () => {
  it("keeps one recording process and finalizes a downloadable video", async () => {
    let recorderCount = 0;
    let downloads = 0;
    const anchor = { href: "", download: "", click: () => { downloads += 1; } };
    const track = { addEventListener: vi.fn(), stop: vi.fn() };
    const stream = { getVideoTracks: () => [track], getTracks: () => [track] };
    vi.stubGlobal("window", { addEventListener: vi.fn(), setTimeout });
    vi.stubGlobal("document", { createElement: () => anchor });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:recording");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia: vi.fn(async () => stream) } });

    class RecorderMock {
      static isTypeSupported() { return true; }
      state = "inactive";
      mimeType = "video/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstart: (() => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() { recorderCount += 1; }
      start() { this.state = "recording"; this.onstart?.(); }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["video bytes"], { type: this.mimeType }) });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", RecorderMock);

    const { recording } = await import("./recording");
    expect(await recording.chooseScreen()).toBe(stream);
    recording.start();
    recording.start();
    expect(recorderCount).toBe(1);
    expect(recording.getSnapshot().phase).toBe("active");
    const detachView = recording.subscribe(() => {});
    detachView();
    expect(recording.getSnapshot().phase).toBe("active");
    recording.stop();
    recording.stop();
    expect(recording.getSnapshot().phase).toBe("idle");
    expect(downloads).toBe(1);
  });
});
