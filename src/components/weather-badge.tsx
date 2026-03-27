import type { DayForecast, SkyCondition, PrecipType } from "@/lib/weather-types"

function weatherEmoji(sky: SkyCondition, precip: PrecipType): string {
  if (precip === "SNOW") return "🌨"
  if (precip === "RAIN_SNOW") return "🌨"
  if (precip === "RAIN") return "🌧"
  if (sky === "CLEAR") return "☀️"
  if (sky === "PARTLY_CLOUDY") return "⛅"
  return "☁️"
}

export function WeatherBadge({ forecast }: { forecast: DayForecast }) {
  const dominantPrecip = forecast.hourly.some((h) => h.precip !== "NONE")
    ? (forecast.hourly.find((h) => h.precip !== "NONE")?.precip ?? "NONE")
    : "NONE"
  const emoji = weatherEmoji(forecast.summary, dominantPrecip)

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
      <span>{emoji}</span>
      <span className="font-medium text-gray-800">{forecast.tempMax}°</span>
      <span className="text-gray-400">/</span>
      <span>{forecast.tempMin}°</span>
    </span>
  )
}
