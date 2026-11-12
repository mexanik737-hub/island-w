/** RU/EN messages, following the saved preference or system language. */
import { useSettings, settingsNow } from "../settings/store";
import type { Language } from "../ipc/settings";
import { en } from "./en";
import { ru } from "./ru";

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
  return DICTIONARIES[resolveLang(useSettings().general.language)];
}

/** The texts now, outside React. */
export function tNow(): Messages {
  return DICTIONARIES[resolveLang(settingsNow().general.language)];
}

/** "fr-FR" or "en-GB": for dates, numbers and sorting. */
export function localeOf(lang: Lang): string {
  return lang === "ru" ? "ru-RU" : "en-GB";
}

export function useLang(): Lang {
  return resolveLang(useSettings().general.language);
}
