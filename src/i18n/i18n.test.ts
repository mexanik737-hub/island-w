import { describe, expect, it } from "vitest";
import { en } from "./en";
import { ru } from "./ru";
import { resolveLang } from "./index";

describe("resolveLang", () => {
  it("follows the setting, or Windows' language for system", () => {
    expect(resolveLang("en", "fr-FR")).toBe("en");
    expect(resolveLang("system", "fr-CA")).toBe("en");
    expect(resolveLang("system", "ru-BY")).toBe("ru");
    expect(resolveLang("system", "RU-ru")).toBe("ru");
    expect(resolveLang("system", "de-DE")).toBe("en");
    expect(resolveLang("system", "ru-RU")).toBe("ru");
    expect(resolveLang("ru", "en-US")).toBe("ru");
  });
});

describe("dictionaries", () => {
  it("translates microphone actions and errors in each language", () => {
    expect(ru.controls.input).toBe("Микрофон");
    expect(ru.controls.muteInput).toBe("Выключить микрофон");
    expect(ru.controls.audioError).not.toBe(en.controls.audioError);
    for (const dictionary of [en, ru]) {
      expect(dictionary.controls.inputVolume).toBeTruthy();
      expect(dictionary.controls.unmuteInput).not.toBe(dictionary.controls.muteInput);
      expect(dictionary.controls.noInput).toBeTruthy();
    }
  });
  it("write counts and sizes each in their own way", () => {
    expect(en.shelf.count(3)).toBe("3 items");
    expect(en.shortcut("Ctrl+Maj+Espace")).toBe("Ctrl+Shift+Space");
    expect(en.percent(76)).toBe("76%");
    expect(ru.percent(76)).toBe("76%");
    expect(ru.settings.general.languages.ru).toBe("Русский");
  });
});
