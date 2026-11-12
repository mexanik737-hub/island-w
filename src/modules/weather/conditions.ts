import type { Messages } from "../../i18n";

export function weatherCondition(symbol: string, t: Messages["weather"]["conditions"]): string {
  const key = symbol.split("_")[0];
  if (key.includes("thunder")) return t.thunder;
  if (key.includes("showers")) return t.showers;
  return t[key as keyof typeof t] ?? t.unknown;
}

export function weatherIcon(symbol: string): string {
  const key = symbol.split("_")[0];
  if (key.includes("thunder")) return "⛈️";
  if (key.includes("sleet")) return "🌨️";
  if (key.includes("snow")) return "❄️";
  if (key.includes("rain")) return "🌧️";
  if (key === "clearsky") return symbol.endsWith("_night") ? "🌙" : "☀️";
  if (key === "fair") return symbol.endsWith("_night") ? "🌙" : "🌤️";
  return ({ partlycloudy: "⛅", cloudy: "☁️", fog: "🌫️" })[key] ?? "🌡️";
}
