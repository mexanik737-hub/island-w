import { describe, expect, it } from "vitest";
import { en } from "../../i18n/en";
import { ru } from "../../i18n/ru";
import { weatherCondition, weatherIcon } from "./conditions";

describe("weather conditions", () => {
  it("translates service codes and handles unknown codes", () => {
    expect(weatherCondition("clearsky_night", ru.weather.conditions)).toBe("Ясно");
    expect(weatherCondition("heavyrainandthunder_day", ru.weather.conditions)).toBe("Гроза");
    expect(weatherCondition("unknown", en.weather.conditions)).toBe("Weather forecast");
    expect(weatherCondition("rainshowers_day", ru.weather.conditions)).toBe("Ливни");
  });
  it("uses night icons and recognizes compound service codes", () => {
    expect(weatherIcon("clearsky_night")).toBe("🌙");
    expect(weatherIcon("clearsky_day")).toBe("☀️");
    expect(weatherIcon("heavysleetshowers_day")).toBe("🌨️");
  });
});
