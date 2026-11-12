/** Development-only visual fixture; never included in the release entry points. */
import { createRoot } from "react-dom/client";
import { DEFAULT_SETTINGS } from "../ipc/settings";
import "../styles/tokens.css";

const params = new URLSearchParams(location.search);
const language = params.get("lang") === "en" ? "en" : "ru";
const theme = params.get("theme") === "light" ? "light" : "dark";
const settings = structuredClone(DEFAULT_SETTINGS);
settings.general.language = language;
settings.general.theme = theme;
let callbackId = 0;
Object.assign(window, { __TAURI_INTERNALS__: {
  metadata: { currentWindow: { label: "settings" }, currentWebview: { label: "settings" } },
  transformCallback: () => ++callbackId,
  unregisterCallback: () => {},
  invoke: async (command: string) => {
    if (command === "system_language") return language;
    if (command === "settings_get") return settings;
    if (command === "settings_monitors") return [{ name: "Display", primary: true }];
    if (command === "weather_search") return [{ label: "Москва, Россия", lat: 55.75, lon: 37.62 }, { label: "Москва, Тверская область, Россия", lat: 57, lon: 35 }];
    if (command === "weather_forecast_at") return forecast;
    return null;
  },
} });
const forecast = {
  city: "Москва, Россия", lat: 55.75, lon: 37.62, temperature: 4, humidity: 84, windSpeed: 3.2, precipitation: 0.2, symbol: "partlycloudy_day", updatedAt: new Date().toISOString(),
  hours: Array.from({ length: 8 }, (_, i) => ({ time: new Date(Date.now() + i * 3600000).toISOString(), temperature: 4 + i, symbol: "partlycloudy_day", precipitation: 0 })),
  days: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10), minimum: i - 2, maximum: i + 5, symbol: "cloudy" })),
};
document.documentElement.dataset.theme = theme;
if (params.get("view") === "settings") {
  await import("../settings/settings.css");
  const { SettingsApp } = await import("../settings/SettingsApp");
  createRoot(document.getElementById("root")!).render(<SettingsApp />);
} else {
  const { saveWeatherForecast } = await import("../modules/weather/store");
  saveWeatherForecast(forecast);
  const { WeatherView } = await import("../modules/weather/WeatherView");
  document.body.style.cssText = "padding:40px;background:#7c899b;display:grid;justify-content:center";
  createRoot(document.getElementById("root")!).render(<div style={{ background: "var(--ink)", borderRadius: 24, overflow: "hidden" }}><WeatherView /></div>);
}
