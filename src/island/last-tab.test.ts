import { describe, expect, it, vi } from "vitest";
import { persistLastTab, restoreLastTab } from "./last-tab";

describe("last selected tab storage", () => {
  it("restores a valid tab and falls back for missing or invalid values", () => {
    expect(restoreLastTab({ getItem: () => "weather" })).toBe("weather");
    expect(restoreLastTab({ getItem: () => "not-a-tab" })).toBe("home");
    expect(restoreLastTab({ getItem: () => null })).toBe("home");
  });

  it("persists a selected tab and tolerates unavailable storage", () => {
    const setItem = vi.fn();
    persistLastTab("notes", { setItem });
    expect(setItem).toHaveBeenCalledWith("island-w:last-tab", "notes");
    expect(() => persistLastTab("notes", { setItem: () => { throw new Error("denied"); } })).not.toThrow();
  });
});
