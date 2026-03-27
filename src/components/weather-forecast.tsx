import type { DayForecast, SkyCondition, PrecipType } from "@/lib/weather-types"

function weatherEmoji(sky: SkyCondition, precip: PrecipType): string {
  if (precip === "SNOW") return "🌨"
  if (precip === "RAIN_SNOW") return "🌨"
  if (precip === "RAIN") return "🌧"
  if (sky === "CLEAR") return "☀️"
  if (sky === "PARTLY_CLOUDY") return "⛅"
  return "☁️"
}

function skyLabel(sky: SkyCondition): string {
  switch (sky) {
    case "CLEAR": return "맑음"
    case "PARTLY_CLOUDY": return "구름 조금"
    case "CLOUDY": return "흐림"
  }
}

export function WeatherForecast({
  forecast,
  location,
}: {
  forecast: DayForecast
  location: string
}) {
  // 06~18시, 3시간 간격
  const displayHours = [6, 9, 12, 15, 18]
  const hourMap = new Map(forecast.hourly.map((h) => [h.hour, h]))

  const dominantPrecip = forecast.hourly.some((h) => h.precip !== "NONE")
    ? (forecast.hourly.find((h) => h.precip !== "NONE")?.precip ?? "NONE")
    : "NONE"
  const summaryEmoji = weatherEmoji(forecast.summary, dominantPrecip)

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>📍</span>
            <span>{location}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">{forecast.source === "KMA" ? "기상청" : "Open-Meteo"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{summaryEmoji}</span>
            <span className="text-sm font-medium text-gray-800">{skyLabel(forecast.summary)}</span>
            <span className="text-sm text-gray-700">
              최고 <strong>{forecast.tempMax}°C</strong> / 최저 {forecast.tempMin}°C
            </span>
            {forecast.precipProbMax > 0 && (
              <span className="text-xs text-blue-600 font-medium">
                강수확률 {forecast.precipProbMax}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 시간별 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {displayHours.map((hour) => {
          const h = hourMap.get(hour)
          if (!h) return null
          return (
            <div
              key={hour}
              className="flex-shrink-0 flex flex-col items-center gap-1 rounded-md bg-white border border-blue-100 px-3 py-2 min-w-[52px]"
            >
              <span className="text-xs text-gray-400 font-medium">{String(hour).padStart(2, "0")}시</span>
              <span className="text-base">{weatherEmoji(h.sky, h.precip)}</span>
              <span className="text-sm font-semibold text-gray-800">{h.temp}°</span>
              {h.precipProb > 0 && (
                <span className="text-xs text-blue-500">{h.precipProb}%</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
