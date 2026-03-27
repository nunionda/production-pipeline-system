// src/lib/weather.ts
import type { HourlyForecast, DayForecast, SkyCondition } from "./weather-types"
import { geocode } from "./geocoding"
import { isKoreanCoord, fetchKmaForecast } from "./kma"

/** Open-Meteo weathercode → SkyCondition 매핑 */
function skyFromOpenMeteo(code: number): SkyCondition {
  if (code === 0 || code === 1) return "CLEAR"
  if (code <= 3) return "PARTLY_CLOUDY"
  return "CLOUDY"
}

/** Open-Meteo API 호출 */
async function fetchOpenMeteoForecast(
  lat: number,
  lng: number,
  targetDate: Date
): Promise<HourlyForecast[] | null> {
  try {
    const kst = new Date(targetDate.getTime() + 9 * 60 * 60 * 1000)
    const yyyy = kst.getUTCFullYear()
    const mm = String(kst.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(kst.getUTCDate()).padStart(2, "0")
    const dateStr = `${yyyy}-${mm}-${dd}`

    const url = new URL("https://api.open-meteo.com/v1/forecast")
    url.searchParams.set("latitude", String(lat))
    url.searchParams.set("longitude", String(lng))
    url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weathercode,windspeed_10m")
    url.searchParams.set("timezone", "Asia/Seoul")
    url.searchParams.set("start_date", dateStr)
    url.searchParams.set("end_date", dateStr)

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!res.ok) return null

    const json = await res.json()
    const { time, temperature_2m, precipitation_probability, weathercode, windspeed_10m } =
      json?.hourly ?? {}

    if (!time?.length) return null

    return (time as string[]).map((t: string, i: number) => {
      const hour = parseInt(t.slice(11, 13), 10)
      return {
        hour,
        temp: Math.round(temperature_2m[i] ?? 0),
        sky: skyFromOpenMeteo(weathercode[i] ?? 0),
        precip: precipitation_probability[i] > 40 ? "RAIN" : "NONE",
        precipProb: precipitation_probability[i] ?? 0,
        windSpeed: Math.round((windspeed_10m[i] ?? 0) / 3.6 * 10) / 10,
      } as HourlyForecast
    })
  } catch {
    return null
  }
}

/** hourly 배열에서 DayForecast 요약 생성 */
function summarize(hourly: HourlyForecast[], source: "KMA" | "OPEN_METEO"): DayForecast {
  const temps = hourly.map((h) => h.temp)
  const probs = hourly.map((h) => h.precipProb)
  const daytime = hourly.filter((h) => h.hour >= 6 && h.hour <= 21)
  const skyPriority: SkyCondition[] = ["CLOUDY", "PARTLY_CLOUDY", "CLEAR"]
  let summary: SkyCondition = "CLEAR"
  for (const s of skyPriority) {
    if (daytime.some((h) => h.sky === s)) { summary = s; break }
  }
  return {
    tempMax: Math.max(...temps),
    tempMin: Math.min(...temps),
    summary,
    precipProbMax: Math.max(...probs),
    hourly,
    source,
  }
}

/**
 * 메인 진입점.
 * location 주소 → geocode → KMA(한국) 또는 Open-Meteo → DayForecast | null
 */
export async function fetchWeather(
  location: string | null | undefined,
  date: Date
): Promise<DayForecast | null> {
  if (!location?.trim()) return null

  const coords = await geocode(location)
  if (!coords) return null

  const { lat, lng } = coords

  if (isKoreanCoord(lat, lng)) {
    const hourly = await fetchKmaForecast(lat, lng, date)
    if (hourly && hourly.length > 0) return summarize(hourly, "KMA")
    // KMA 실패 시 Open-Meteo fallback
  }

  const hourly = await fetchOpenMeteoForecast(lat, lng, date)
  if (!hourly || hourly.length === 0) return null
  return summarize(hourly, "OPEN_METEO")
}
