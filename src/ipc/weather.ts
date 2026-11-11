import { invoke } from "@tauri-apps/api/core";

export interface WeatherHour {
  time: string;
  temperature: number;
  symbol: string;
  precipitation: number | null;
}
export interface WeatherDay {
  date: string;
  minimum: number;
  maximum: number;
  symbol: string;
}
export interface WeatherForecast {
  city: string;
  lat: number;
  lon: number;
  temperature: number;
  humidity: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  symbol: string;
  updatedAt: string;
  hours: WeatherHour[];
  days: WeatherDay[];
}
export const getWeather = (place: string) => invoke<WeatherForecast>("weather_forecast", { place });
export const getWeatherAt = (place: string, lat: number, lon: number) => invoke<WeatherForecast>("weather_forecast_at", { place, lat, lon });
