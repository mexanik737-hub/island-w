import { useEffect, useState } from "react";
import type { Size } from "../../island/geometry";
import { formatClock, formatDay, msUntilNextMinute } from "./time";
import { localeOf, resolveLang } from "../../i18n";
import { useSettings } from "../../settings/store";
import { useWeatherSnapshot } from "../weather/store";
import "./clock.css";

export const CLOCK_PANEL_SIZE: Size = [260, 92, 26];

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const date = new Date();
      setNow(date);
      timer = setTimeout(tick, msUntilNextMinute(date));
    };
    timer = setTimeout(tick, msUntilNextMinute(new Date()));
    return () => clearTimeout(timer);
  }, []);
  return now;
}
function useLocale(): string | undefined {
  const language = useSettings().general.language;
  return language === "system" ? undefined : localeOf(resolveLang(language));
}

/** The folded pill: clock, and the user-selected city's temperature when available. */
export function IdleClock() {
  const now = useNow();
  const locale = useLocale();
  const forecast = useWeatherSnapshot().forecast;
  return (
    <div className="clock-idle">
      <time dateTime={now.toISOString()}>{formatClock(now, locale)}</time>
      {forecast && <span className="clock-weather" title={forecast.city}>{Math.round(forecast.temperature)}°</span>}
    </div>
  );
}
export function ClockPanel() {
  const now = useNow();
  const locale = useLocale();
  return (
    <div className="clock-panel">
      <time className="clock-panel-time" dateTime={now.toISOString()}>{formatClock(now, locale)}</time>
      <span className="clock-panel-day">{formatDay(now, locale)}</span>
    </div>
  );
}
