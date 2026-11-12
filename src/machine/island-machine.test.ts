import { describe, expect, it } from "vitest";
import { initialState, reduce } from "./island-machine";

describe("island navigation", () => {
  it("reopens on the last selected tab after closing", () => {
    const selected = reduce({ ...initialState, open: true }, { type: "tab.select", tab: "weather" });
    const closed = reduce(selected, { type: "close" });
    const reopened = reduce(closed, { type: "press" });
    expect(reopened.open).toBe(true);
    expect(reopened.tab).toBe("weather");
  });

  it("keeps the panel open after leaving when automatic hide is disabled", () => {
    const open = { ...initialState, open: true, hovered: true, autoHide: false };
    expect(reduce(open, { type: "hover.end" }).open).toBe(true);
  });

  it("keeps background process indicators when the panel auto-hides", () => {
    const withProcesses = reduce(
      reduce({ ...initialState, open: true, hovered: true }, { type: "activity.set", activity: { id: "screen-recording", priority: 70 } }),
      { type: "activity.set", activity: { id: "phone-sharing", priority: 60 } },
    );
    const folded = reduce(withProcesses, { type: "hover.end" });
    expect(folded.open).toBe(false);
    expect(folded.activities.map((activity) => activity.id)).toEqual(["screen-recording", "phone-sharing"]);
  });
});
