import { useEffect, useState, type FormEvent } from "react";
import { getWeather, type WeatherForecast } from "../../ipc/weather";
import "./weather.css";

const PLACE_KEY = "island-w:weather-place";
const SYMBOLS: Record<string, string> = {
  clearsky: "☀️", fair: "🌤️", partlycloudy: "⛅", cloudy: "☁️", fog: "🌫️",
  rain: "🌧️", lightrain: "🌦️", heavyrain: "🌧️", sleet: "🌨️", snow: "❄️",
  lightsnow: "🌨️", heavysnow: "❄️", thunder: "⛈️", clearnight: "🌙",
  fairnight: "🌙", rainshowers: "🌦️", snowshowers: "🌨️",
};
function icon(symbol: string) {
  const key = symbol.split("_")[0];
  return SYMBOLS[key] ?? "🌡️";
}
function hourLabel(time: string) {
  return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString([], { weekday: "short", day: "numeric" });
}

export function WeatherView() {
  const [place, setPlace] = useState(() => {
    try { return localStorage.getItem(PLACE_KEY) ?? ""; } catch { return ""; }
  });
  const [query, setQuery] = useState(place);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await getWeather(name.trim());
      setForecast(result);
      setPlace(name.trim());
      setQuery(name.trim());
      try { localStorage.setItem(PLACE_KEY, name.trim()); } catch { /* storage may be disabled */ }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (place) void load(place);
  // Only the saved place is loaded when the view first mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load(query);
  };

  return (
    <section className="weather-panel">
      <header className="weather-head">
        <div><strong>Weather</strong><span>{forecast?.city ?? "Choose a city"}</span></div>
        <form onSubmit={submit}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="City or place" aria-label="Weather location" />
          <button type="submit" disabled={loading || !query.trim()}>{loading ? "…" : "Find"}</button>
        </form>
      </header>
      {error && <p className="weather-error">{error}</p>}
      {!forecast && !loading && !error && <div className="weather-empty">Enter a city to see the forecast. Island does not read your device location.</div>}
      {forecast && (
        <>
          <div className="weather-current">
            <span className="weather-symbol">{icon(forecast.symbol)}</span>
            <div><strong>{Math.round(forecast.temperature)}°</strong><span>{forecast.symbol.replaceAll("_", " ")}</span></div>
            <dl>
              <div><dt>Wind</dt><dd>{forecast.windSpeed === null ? "—" : `${forecast.windSpeed.toFixed(1)} m/s`}</dd></div>
              <div><dt>Humidity</dt><dd>{forecast.humidity === null ? "—" : `${Math.round(forecast.humidity)}%`}</dd></div>
              <div><dt>Rain</dt><dd>{forecast.precipitation === null ? "—" : `${forecast.precipitation.toFixed(1)} mm`}</dd></div>
            </dl>
          </div>
          <div className="weather-subtitle">Next hours</div>
          <div className="weather-hours">
            {forecast.hours.slice(0, 8).map((hour) => <div key={hour.time}><span>{hourLabel(hour.time)}</span><b>{icon(hour.symbol)}</b><strong>{Math.round(hour.temperature)}°</strong></div>)}
          </div>
          <div className="weather-subtitle">Week ahead</div>
          <div className="weather-days">
            {forecast.days.map((day) => <div key={day.date}><span>{dayLabel(day.date)}</span><b>{icon(day.symbol)}</b><strong>{Math.round(day.maximum)}°</strong><small>{Math.round(day.minimum)}°</small></div>)}
          </div>
          <footer className="weather-credit">Forecast: MET Norway · Place search: © OpenStreetMap contributors</footer>
        </>
      )}
    </section>
  );
}
