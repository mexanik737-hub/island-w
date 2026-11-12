import type { Tab } from "../machine/island-machine";
import { TABS } from "./tabs";

const KEY = "island-w:last-tab";
const IDS = new Set<Tab>(TABS.map(({ id }) => id));

export function restoreLastTab(storage: Pick<Storage, "getItem">): Tab {
  try {
    const saved = storage.getItem(KEY);
    return saved && IDS.has(saved as Tab) ? saved as Tab : "home";
  } catch {
    return "home";
  }
}

export function persistLastTab(tab: Tab, storage: Pick<Storage, "setItem">): void {
  try {
    storage.setItem(KEY, tab);
  } catch {
    // Storage can be unavailable in restricted WebView contexts.
  }
}
