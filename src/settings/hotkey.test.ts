import { describe, expect, it } from "vitest";
import { better, hotkeyLabel, isSingleKey, keyName, pressed, type KeyNames, type KeyPress } from "./hotkey";

const RU: KeyNames = { shift: "Shift", space: "Пробел", none: "Нет", twice: "×2", keys: { enter: "Ввод", pause: "Пауза", pageUp: "Стр↑", pageDown: "Стр↓", end: "Конец", home: "Домой", insert: "Вставка", delete: "Удалить", scrollLock: "Прокрутка" } };
const EN: KeyNames = { shift: "Shift", space: "Space", none: "None", twice: "×2", keys: { enter: "Enter", pause: "Pause", pageUp: "Page Up", pageDown: "Page Down", end: "End", home: "Home", insert: "Insert", delete: "Delete", scrollLock: "Scroll Lock" } };
const press = (keyCode: number, key: string, mods: Partial<KeyPress> = {}): KeyPress => ({
  keyCode,
  key,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

describe("pressed", () => {
  it("records modifiers and one key", () => {
    expect(pressed(press(0x49, "i", { ctrlKey: true, altKey: true }), RU)).toEqual({
      kind: "candidate",
      hotkey: { ctrl: true, alt: true, shift: false, win: false, key: 0x49, label: "Ctrl+Alt+I", double: false },
    });
    expect(pressed(press(0x20, " ", { altKey: true, shiftKey: true }), RU)).toMatchObject({ hotkey: { label: "Alt+Shift+Пробел" } });
    // AltGr+E types € on a French keyboard: the shortcut is still E.
    expect(pressed(press(0x45, "€", { ctrlKey: true, altKey: true }), RU)).toMatchObject({ hotkey: { label: "Ctrl+Alt+E" } });
  });

  it("takes a modifier alone, asked twice by default", () => {
    expect(pressed(press(17, "Control", { ctrlKey: true }), RU)).toEqual({
      kind: "candidate",
      hotkey: { ctrl: false, alt: false, shift: false, win: false, key: 17, label: "Ctrl", double: true },
    });
    expect(pressed(press(92, "Meta", { metaKey: true }), EN)).toMatchObject({ hotkey: { key: 91, label: "Win" } });
    expect(pressed(press(18, "Alt", { ctrlKey: true, altKey: true }), RU)).toEqual({ kind: "pending", label: "Ctrl+Alt+" });
  });

  it("takes a key alone only when it types nothing", () => {
    expect(pressed(press(0x78, "F9"), RU)).toMatchObject({ kind: "candidate", hotkey: { label: "F9", key: 0x78 } });
    expect(pressed(press(0x41, "a"), RU)).toEqual({ kind: "alone" });
    expect(pressed(press(0x20, " "), RU)).toEqual({ kind: "alone" });
  });
});

describe("better", () => {
  it("keeps the key over the modifier pressed first", () => {
    const ctrl = { ctrl: false, alt: false, shift: false, win: false, key: 17, label: "Ctrl", double: true };
    const ctrlI = { ctrl: true, alt: false, shift: false, win: false, key: 0x49, label: "Ctrl+I", double: false };
    expect(better(null, ctrl)).toBe(ctrl);
    expect(better(ctrl, ctrlI)).toBe(ctrlI);
    // Ctrl released last, after I: still Ctrl+I.
    expect(better(ctrlI, ctrl)).toBe(ctrlI);
  });
});

describe("hotkeyLabel", () => {
  it("shows a shortcut in this language's words", () => {
    const hotkey = { ctrl: false, alt: true, shift: true, win: false, key: 0x20, label: "Alt+Maj+Espace", double: false };
    expect(hotkeyLabel(hotkey, EN)).toBe("Alt+Shift+Space");
    expect(hotkeyLabel(hotkey, RU)).toBe("Alt+Shift+Пробел");
    expect(hotkeyLabel({ ...hotkey, key: 0 }, RU)).toBe("Нет");
    const shift = { ctrl: false, alt: false, shift: false, win: false, key: 16, label: "Maj", double: true };
    expect(hotkeyLabel(shift, EN)).toBe("Shift ×2");
    expect(isSingleKey(shift)).toBe(true);
    expect(isSingleKey(hotkey)).toBe(false);
  });
  it("shows named keys in the selected language even when the stored label is old", () => {
    const enter = { ctrl: true, alt: false, shift: false, win: false, key: 0x0d, label: "Ctrl+Entrée", double: false };
    expect(hotkeyLabel(enter, EN)).toBe("Ctrl+Enter");
    expect(hotkeyLabel(enter, RU)).toBe("Ctrl+Ввод");
    expect(keyName(press(0x24, "Home"), RU)).toBe("Домой");
  });
});
