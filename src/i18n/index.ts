/**
 * Quiera's languages. Texts live in one dictionary per language: `fr` is
 * the source, and `en` must have every entry (its type is `fr`'s), so a
 * text missing in English fails the build.
 *
 * The language is the setting's, or for "system" Windows' display
 * language (the web view's navigator.language): Russian, French, or English.
 */
import { useSettings, settingsNow } from "../settings/store";
import type { Language } from "../ipc/settings";
import { fr } from "./fr";
import { en } from "./en";
import { ru } from "./ru";

export type Messages = typeof fr;
export type Lang = "fr" | "en" | "ru";

export function resolveLang(setting: Language, system = navigator.language): Lang {
  if (setting === "fr" || setting === "en" || setting === "ru") return setting;
  const detected = system.toLowerCase();
  if (detected.startsWith("ru")) return "ru";
  return detected.startsWith("fr") ? "fr" : "en";
}

const DICTIONARIES: Record<Lang, Messages> = { fr, en, ru };

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
  return lang === "fr" ? "fr-FR" : lang === "ru" ? "ru-RU" : "en-GB";
}

export function useLang(): Lang {
  return resolveLang(useSettings().general.language);
}
