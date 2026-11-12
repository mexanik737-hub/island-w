import { useEffect, useRef, useState, type FormEvent } from "react";
import { getWeatherAt, searchWeatherPlaces, type WeatherPlace } from "../../ipc/weather";
import { weatherCondition, weatherIcon as icon } from "./conditions";
import { saveWeatherForecast, useWeatherSnapshot, WEATHER_CACHE_FOR } from "./store";
import { localeOf, useLang, useT } from "../../i18n";
import "./weather.css";

function hourLabel(time: string, locale: string) {
  return new Date(time).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(date: string, locale: string) {
  return new Date(date + "T12:00:00").toLocaleDateString(locale, { weekday: "short", day: "numeric" });
}

export function WeatherView() {
  const t = useT().weather;
  const locale = localeOf(useLang());
  const cache = useWeatherSnapshot();
  const forecast = cache.forecast;
  const [query, setQuery] = useState(forecast?.city ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<WeatherPlace[] | null>(null);
  const request = useRef(0);

  const load = async (place: WeatherPlace) => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await getWeatherAt(place.label, place.lat, place.lon);
      if (id !== request.current) return;
      saveWeatherForecast(result);
      setQuery(result.city);
      setResults(null);
    } catch {
      if (id === request.current) setError(t.forecastError);
    } finally {
      if (id === request.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (forecast && Date.now() - cache.savedAt >= WEATHER_CACHE_FOR) {
      void load({ label: forecast.city, lat: forecast.lat, lon: forecast.lon });
    }
    return () => { request.current++; };
    // Refresh the saved coordinates once when the weather tab is first opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const places = await searchWeatherPlaces(query.trim());
      if (id === request.current) setResults(places);
    } catch {
      if (id === request.current) setError(t.searchError);
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  return (
    <section className="weather-panel">
      <header className="weather-head">
        <div><strong>{t.weather}</strong><span>{forecast?.city ?? t.chooseCity}</span></div>
        <form onSubmit={submit}>
          <input value={query} onChange={(event) => { request.current++; setLoading(false); setResults(null); setQuery(event.target.value); }} placeholder={t.cityOrPlace} aria-label={t.cityOrPlace} />
          <button type="submit" disabled={loading || !query.trim()}>{loading ? "…" : t.find}</button>
        </form>
      </header>
      {error && <p className="weather-error">{error}</p>}
      {results !== null && <div className="weather-results" aria-label={t.chooseResult}>
        <strong>{results.length ? t.chooseResult : t.noResults}</strong>
        {results.map((place) => <button key={`${place.lat},${place.lon}`} disabled={loading} onClick={() => void load(place)}>{place.label}</button>)}
      </div>}
      {!forecast && !loading && !error && <div className="weather-empty">{t.enterCity}</div>}
      {forecast && (
        <div className="weather-layout">
          <div className="weather-current">
            <span className="weather-symbol">{icon(forecast.symbol)}</span>
            <div><strong>{Math.round(forecast.temperature)}°</strong><span>{weatherCondition(forecast.symbol, t.conditions)}</span></div>
            <dl>
              <div><dt>{t.wind}</dt><dd>{forecast.windSpeed === null ? "—" : `${forecast.windSpeed.toLocaleString(locale, { maximumFractionDigits: 1 })} ${t.windUnit}`}</dd></div>
              <div><dt>{t.humidity}</dt><dd>{forecast.humidity === null ? "—" : `${Math.round(forecast.humidity)}%`}</dd></div>
              <div><dt>{t.rain}</dt><dd>{forecast.precipitation === null ? "—" : `${forecast.precipitation.toLocaleString(locale, { maximumFractionDigits: 1 })} ${t.rainUnit}`}</dd></div>
            </dl>
          </div>
          <div className="weather-detail">
          <div className="weather-subtitle">{t.nextHours}</div>
          <div className="weather-hours">
            {forecast.hours.slice(0, 8).map((hour) => <div key={hour.time}><span>{hourLabel(hour.time, locale)}</span><b>{icon(hour.symbol)}</b><strong>{Math.round(hour.temperature)}°</strong></div>)}
          </div>
          <div className="weather-subtitle">{t.weekAhead}</div>
          <div className="weather-days">
            {forecast.days.map((day) => <div key={day.date}><span>{dayLabel(day.date, locale)}</span><b>{icon(day.symbol)}</b><strong>{Math.round(day.maximum)}°</strong><small>{Math.round(day.minimum)}°</small></div>)}
          </div>
          </div>
          <footer className="weather-credit">{t.credit}</footer>
        </div>
      )}
    </section>
  );
}
