import type { HourlyForecast, SkyCondition, PrecipType } from "./weather-types"

/** 한국 좌표 범위 판정 */
export function isKoreanCoord(lat: number, lng: number): boolean {
  return lat >= 33 && lat <= 38 && lng >= 125 && lng <= 132
}

/** 위경도 → 기상청 격자 좌표 변환 (Lambert Conformal Conic) */
export function latLngToGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877
  const GRID = 5.0
  const SLAT1 = 30.0
  const SLAT2 = 60.0
  const OLON = 126.0
  const OLAT = 38.0
  const XO = 43
  const YO = 136

  const DEGRAD = Math.PI / 180.0
  const re = RE / GRID
  const slat1 = SLAT1 * DEGRAD
  const slat2 = SLAT2 * DEGRAD
  const olon = OLON * DEGRAD
  const olat = OLAT * DEGRAD

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)

  const ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5)
  const r = (re * sf) / Math.pow(ra, sn)
  let theta = lng * DEGRAD - olon
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn

  const nx = Math.floor(r * Math.sin(theta) + XO + 0.5)
  const ny = Math.floor(ro - r * Math.cos(theta) + YO + 0.5)
  return { nx, ny }
}

/**
 * 현재 시각 기준으로 사용할 기상청 단기예보 발표 회차를 반환한다.
 * 발표 시각: 0200 0500 0800 1100 1400 1700 2000 2300
 * 발표 후 약 10분 뒤부터 데이터 제공되므로 여유 있게 이전 회차 사용.
 */
export function getKmaBaseTime(now: Date): { base_date: string; base_time: string } {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const hour = kst.getUTCHours()
  const minute = kst.getUTCMinutes()
  const totalMin = hour * 60 + minute

  const baseTimes = [
    { min: 2 * 60 + 10, time: "0200" },
    { min: 5 * 60 + 10, time: "0500" },
    { min: 8 * 60 + 10, time: "0800" },
    { min: 11 * 60 + 10, time: "1100" },
    { min: 14 * 60 + 10, time: "1400" },
    { min: 17 * 60 + 10, time: "1700" },
    { min: 20 * 60 + 10, time: "2000" },
    { min: 23 * 60 + 10, time: "2300" },
  ]

  let selectedTime = "2300"
  let dateOffset = 0

  const passed = baseTimes.filter((b) => totalMin >= b.min)
  if (passed.length === 0) {
    dateOffset = -1
    selectedTime = "2300"
  } else {
    selectedTime = passed[passed.length - 1].time
  }

  const targetDate = new Date(kst.getTime() + dateOffset * 24 * 60 * 60 * 1000)
  const yyyy = targetDate.getUTCFullYear()
  const mm = String(targetDate.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(targetDate.getUTCDate()).padStart(2, "0")

  return { base_date: `${yyyy}${mm}${dd}`, base_time: selectedTime }
}

export function skyFromKma(skyCode: string): SkyCondition {
  switch (skyCode) {
    case "1": return "CLEAR"
    case "3": return "PARTLY_CLOUDY"
    case "4": return "CLOUDY"
    default:  return "CLOUDY"
  }
}

export function precipFromKma(ptyCode: string): PrecipType {
  switch (ptyCode) {
    case "0": return "NONE"
    case "1": return "RAIN"
    case "2": return "RAIN_SNOW"
    case "3": return "SNOW"
    case "4": return "RAIN"
    default:  return "NONE"
  }
}

/**
 * 기상청 단기예보 API를 호출해 targetDate 당일의 시간별 예보를 반환한다.
 * 실패 시 null 반환 (throw 없음).
 */
export async function fetchKmaForecast(
  lat: number,
  lng: number,
  targetDate: Date
): Promise<HourlyForecast[] | null> {
  try {
    const serviceKey = process.env.KMA_SERVICE_KEY
    if (!serviceKey) return null

    const { nx, ny } = latLngToGrid(lat, lng)
    const { base_date, base_time } = getKmaBaseTime(new Date())

    const url = new URL("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst")
    url.searchParams.set("serviceKey", serviceKey)
    url.searchParams.set("numOfRows", "300")
    url.searchParams.set("pageNo", "1")
    url.searchParams.set("dataType", "JSON")
    url.searchParams.set("base_date", base_date)
    url.searchParams.set("base_time", base_time)
    url.searchParams.set("nx", String(nx))
    url.searchParams.set("ny", String(ny))

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!res.ok) return null

    const json = await res.json()
    const items: Array<{ category: string; fcstDate: string; fcstTime: string; fcstValue: string }> =
      json?.response?.body?.items?.item ?? []

    if (items.length === 0) return null

    // targetDate의 날짜 문자열 (YYYYMMDD, KST)
    const kst = new Date(targetDate.getTime() + 9 * 60 * 60 * 1000)
    const yyyy = kst.getUTCFullYear()
    const mm = String(kst.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(kst.getUTCDate()).padStart(2, "0")
    const targetDateStr = `${yyyy}${mm}${dd}`

    // 해당 날짜 아이템만 필터링, 시간별로 그룹화
    const byHour = new Map<number, { TMP?: string; SKY?: string; PTY?: string; POP?: string; WSD?: string }>()
    for (const item of items) {
      if (item.fcstDate !== targetDateStr) continue
      const hour = parseInt(item.fcstTime.slice(0, 2), 10)
      if (!byHour.has(hour)) byHour.set(hour, {})
      const entry = byHour.get(hour)!
      if (["TMP", "SKY", "PTY", "POP", "WSD"].includes(item.category)) {
        ;(entry as Record<string, string>)[item.category] = item.fcstValue
      }
    }

    const hours = Array.from(byHour.keys()).sort((a, b) => a - b)
    if (hours.length === 0) return null

    return hours.map((hour) => {
      const e = byHour.get(hour)!
      return {
        hour,
        temp: Math.round(parseFloat(e.TMP ?? "0")),
        sky: skyFromKma(e.SKY ?? "1"),
        precip: precipFromKma(e.PTY ?? "0"),
        precipProb: parseInt(e.POP ?? "0", 10),
        windSpeed: parseFloat(e.WSD ?? "0"),
      }
    })
  } catch {
    return null
  }
}
