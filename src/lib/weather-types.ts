export type SkyCondition = "CLEAR" | "PARTLY_CLOUDY" | "CLOUDY"
export type PrecipType = "NONE" | "RAIN" | "SNOW" | "RAIN_SNOW"

export type HourlyForecast = {
  hour: number        // 0~23
  temp: number        // °C (정수)
  sky: SkyCondition
  precip: PrecipType
  precipProb: number  // 0~100
  windSpeed: number   // m/s
}

export type DayForecast = {
  tempMax: number
  tempMin: number
  summary: SkyCondition
  precipProbMax: number
  hourly: HourlyForecast[]
  source: "KMA" | "OPEN_METEO"
}
