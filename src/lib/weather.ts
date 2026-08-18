/**
 * Open-Meteo daily forecast, no API key. Used by the Departure Board and the
 * Now deck. Returns null on any failure — callers hide the card, never render
 * a placeholder. Cached 3h by Next fetch cache.
 */
export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number | null;
  /** WMO code */
  code: number;
  /** i18n key, e.g. cockpit.weatherClear */
  key: string;
  sunset: string | null; // "HH:mm" local to the place
}

export function wmoKey(code: number): string {
  if (code === 0) return "cockpit.weatherClear";
  if (code <= 3) return "cockpit.weatherPartlyCloudy";
  if (code <= 48) return "cockpit.weatherFoggy";
  if (code <= 57) return "cockpit.weatherDrizzle";
  if (code <= 67) return "cockpit.weatherRain";
  if (code <= 77) return "cockpit.weatherSnow";
  if (code <= 82) return "cockpit.weatherRainShowers";
  if (code <= 86) return "cockpit.weatherSnowShowers";
  return "cockpit.weatherThunder";
}

export async function getDailyWeather(lat: number, lng: number, date: string): Promise<DailyWeather | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunset&start_date=${date}&end_date=${date}&timezone=auto`,
      { next: { revalidate: 10800 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const code = data?.daily?.weather_code?.[0];
    const tempMax = data?.daily?.temperature_2m_max?.[0];
    const tempMin = data?.daily?.temperature_2m_min?.[0];
    const sunset: string | undefined = data?.daily?.sunset?.[0];
    if (typeof tempMax !== "number" || typeof code !== "number") return null;
    return {
      date,
      tempMax: Math.round(tempMax),
      tempMin: typeof tempMin === "number" ? Math.round(tempMin) : null,
      code,
      key: wmoKey(code),
      sunset: sunset && sunset.length >= 16 ? sunset.slice(11, 16) : null,
    };
  } catch {
    return null;
  }
}

/** Open-Meteo forecasts reach ~16 days out; beyond that ask for "today there". */
export function weatherDateFor(startDate: string, todayIso: string): { date: string; isTripDay: boolean } {
  const days = Math.round((Date.parse(startDate) - Date.parse(todayIso)) / 86_400_000);
  return days >= 0 && days <= 15 ? { date: startDate, isTripDay: true } : { date: todayIso, isTripDay: false };
}
