/** RU/EN messages, following the saved preference or system language. */
import { useSettings, settingsNow } from "../settings/store";
import type { Language } from "../ipc/settings";
import { en } from "./en";
import { ru } from "./ru";
import { useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

let systemLanguage = typeof navigator === "undefined" ? "en" : navigator.language;
let detecting = false;
const listeners = new Set<() => void>();
function detectSystemLanguage() {
  if (detecting) return;
  detecting = true;
  // WebView's preferred content language may differ from Windows' UI language.
  void invoke<string>("system_language").then((language) => {
    systemLanguage = language;
    listeners.forEach((listener) => listener());
  }).catch(() => {});
}
function subscribeSystemLanguage(listener: () => void) {
  listeners.add(listener);
  detectSystemLanguage();
  return () => { listeners.delete(listener); };
}

export type Messages = typeof en;
export type Lang = "en" | "ru";

export function resolveLang(setting: Language, system = navigator.language): Lang {
  if (setting === "en" || setting === "ru") return setting;
  const detected = system.toLowerCase();
  if (detected.startsWith("ru")) return "ru";
  return "en";
}

const DICTIONARIES: Record<Lang, Messages> = { en, ru };

/** The texts in the current language, re-rendering when it changes. */
export function useT(): Messages {
  return DICTIONARIES[useLang()];
}

/** The texts now, outside React. */
export function tNow(): Messages {
  detectSystemLanguage();
  return DICTIONARIES[resolveLang(settingsNow().general.language, systemLanguage)];
}

/** RU/EN locale for dates, numbers and sorting. */
export function localeOf(lang: Lang): string {
  return lang === "ru" ? "ru-RU" : "en-GB";
}

export function useLang(): Lang {
  const system = useSyncExternalStore(subscribeSystemLanguage, () => systemLanguage);
  return resolveLang(useSettings().general.language, system);
}
