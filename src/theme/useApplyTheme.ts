import { useLayoutEffect } from "react";
import type { Theme } from "../ipc/settings";

/** Applies the persisted theme in both the island and its settings window. */
export function useApplyTheme(theme: Theme): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      root.dataset.theme = theme === "system" ? (media.matches ? "light" : "dark") : theme;
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}
