import { describe, expect, it } from "vitest";
import { en } from "./en";
import { ru } from "./ru";
import { fr } from "./fr";
import { resolveLang } from "./index";

describe("resolveLang", () => {
  it("follows the setting, or Windows' language for system", () => {
    expect(resolveLang("fr", "en-US")).toBe("fr");
    expect(resolveLang("en", "fr-FR")).toBe("en");
    expect(resolveLang("system", "fr-CA")).toBe("fr");
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
    for (const dictionary of [en, fr, ru]) {
      expect(dictionary.controls.inputVolume).toBeTruthy();
      expect(dictionary.controls.unmuteInput).not.toBe(dictionary.controls.muteInput);
      expect(dictionary.controls.noInput).toBeTruthy();
    }
  });
  it("write counts and sizes each in their own way", () => {
    expect(fr.shelf.count(1)).toBe("1 élément");
    expect(en.shelf.count(3)).toBe("3 items");
    expect(en.shortcut("Ctrl+Maj+Espace")).toBe("Ctrl+Shift+Space");
    expect(fr.shortcut("Ctrl+Maj+Espace")).toBe("Ctrl+Maj+Espace");
    expect(en.percent(76)).toBe("76%");
    expect(ru.percent(76)).toBe("76%");
    expect(ru.settings.general.languages.ru).toBe("Русский");
  });
});
