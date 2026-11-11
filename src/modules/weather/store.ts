import { useSyncExternalStore } from "react";
import { getWeatherAt, type WeatherForecast } from "../../ipc/weather";

const CACHE_KEY = "island-w:weather-cache";
export const WEATHER_CACHE_FOR = 3 * 60 * 60 * 1000;
export interface WeatherSnapshot {
  forecast: WeatherForecast | null;
  savedAt: number;
}
function readCache(): WeatherSnapshot {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { forecast: null, savedAt: 0 };
    const parsed = JSON.parse(raw) as { savedAt?: number; forecast?: WeatherForecast };
    if (!parsed.forecast || typeof parsed.forecast.lat !== "number" || typeof parsed.forecast.lon !== "number") {
      return { forecast: null, savedAt: 0 };
    }
    return { forecast: parsed.forecast, savedAt: parsed.savedAt ?? 0 };
  } catch {
    return { forecast: null, savedAt: 0 };
  }
}
let snapshot = readCache();
const listeners = new Set<() => void>();
let started = false;
let refreshing = false;
function publish(next: WeatherSnapshot) {
  snapshot = next;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* storage may be disabled */ }
  listeners.forEach((listener) => listener());
}
export function saveWeatherForecast(forecast: WeatherForecast) {
  publish({ forecast, savedAt: Date.now() });
}
export function useWeatherSnapshot(): WeatherSnapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
}
/** Refresh only a city the user has explicitly selected; never reads IP or device location. */
export function startWeatherService(): void {
  if (started) return;
  started = true;
  const refresh = async () => {
    if (refreshing || !snapshot.forecast || Date.now() - snapshot.savedAt < WEATHER_CACHE_FOR) return;
    refreshing = true;
    const old = snapshot.forecast;
    try {
      const next = await getWeatherAt(old.city, old.lat, old.lon);
      saveWeatherForecast(next);
    } catch {
      // Keep the last known forecast; opening the Weather tab will show any refresh error.
    } finally {
      refreshing = false;
    }
  };
  void refresh();
  window.setInterval(() => void refresh(), 15 * 60 * 1000);
}
