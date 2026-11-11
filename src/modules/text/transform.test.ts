import { describe, expect, it } from "vitest";
import { transformText } from "./transform";
describe("text transforms",()=>{
it("converts Russian keyboard-layout typos to English",()=>expect(transformText("layout-ru-en","руддщ")).toBe("hello"));
it("converts English keyboard-layout typos to Russian",()=>expect(transformText("layout-en-ru","ghbdtn")).toBe("привет"));
it("transliterates Cyrillic text",()=>expect(transformText("transliterate","Привет, мир")).toBe("Privet, mir"));
it("formats JSON",()=>expect(transformText("json-format","{\"a\":1}")).toBe('{\n  "a": 1\n}'));
it("round-trips UTF-8 through Base64",()=>{const encoded=transformText("base64-encode","Привет 🌴");expect(transformText("base64-decode",encoded)).toBe("Привет 🌴");});
it("reports invalid JSON",()=>expect(transformText("json-format","{")).toMatch(/^Error:/));
});
