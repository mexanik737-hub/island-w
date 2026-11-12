import { describe, expect, it } from "vitest";
import { tabShown, TABS } from "./tabs";

describe("shelf navigation", () => {
  it("keeps the explicit shelf button available when the shelf is empty", () => {
    const shelf = TABS.find((tab) => tab.id === "shelf");
    expect(shelf).toBeDefined();
    expect(tabShown(shelf!, "home", 0, [])).toBe(true);
    expect(tabShown(shelf!, "home", 0, ["shelf"])).toBe(true);
  });
});
