# 날씨 API 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 촬영일 날씨 예보를 스케줄 목록(아이콘+기온)과 촬영일 상세 페이지(시간별 카드)에 표시한다.

**Architecture:** `ShootingDay.location` 주소 → Kakao Geocoding API → lat/lng → 한국 좌표면 기상청 단기예보 API, 아니면 Open-Meteo. Server Component에서 `fetch()` + `next: { revalidate: 3600 }` 캐싱. 에러는 모두 null 반환으로 조용히 skip.

**Tech Stack:** Next.js 15 App Router (Server Components), TypeScript, Kakao REST API, 기상청 단기예보 API v2, Open-Meteo API, Vitest

---

## 파일 맵

| 파일 | 역할 |
|------|------|
| `src/lib/weather-types.ts` | `HourlyForecast`, `DayForecast` 타입 정의 |
| `src/lib/kma.ts` | 격자 변환 + base_time 계산 + 기상청 fetch/파싱 |
| `src/lib/geocoding.ts` | Kakao 주소 → lat/lng |
| `src/lib/weather.ts` | `fetchWeather()` 오케스트레이터 (KMA / Open-Meteo 분기) |
| `src/test/weather.test.ts` | 순수 함수 단위 테스트 |
| `src/components/weather-badge.tsx` | 목록용 컴팩트 배지 |
| `src/components/weather-forecast.tsx` | 상세용 시간별 카드 |
| `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/page.tsx` | 스케줄 목록에 WeatherBadge 추가 |
| `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx` | 상세 페이지에 WeatherForecast 추가 |

---

## Task 1: 공유 타입 정의

**Files:**
- Create: `src/lib/weather-types.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/lib/weather-types.ts

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
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/weather-types.ts
git commit -m "feat: weather shared types"
```

---

## Task 2: 순수 유틸 함수 + 테스트 (TDD)

**Files:**
- Create: `src/lib/kma.ts` (순수 함수만)
- Create: `src/test/weather.test.ts`

### 2-A: `isKoreanCoord` 테스트 → 구현

- [ ] **Step 1: 테스트 작성**

```typescript
// src/test/weather.test.ts
import { describe, it, expect } from "vitest"
import { isKoreanCoord, latLngToGrid, getKmaBaseTime, skyFromKma, precipFromKma } from "@/lib/kma"

describe("isKoreanCoord", () => {
  it("서울 좌표를 한국으로 판정", () => {
    expect(isKoreanCoord(37.5665, 126.9780)).toBe(true)
  })
  it("부산 좌표를 한국으로 판정", () => {
    expect(isKoreanCoord(35.1796, 129.0756)).toBe(true)
  })
  it("도쿄 좌표를 한국 외로 판정", () => {
    expect(isKoreanCoord(35.6762, 139.6503)).toBe(false)
  })
  it("LA 좌표를 한국 외로 판정", () => {
    expect(isKoreanCoord(34.0522, -118.2437)).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
bun run test
```
Expected: `isKoreanCoord` not found 에러

- [ ] **Step 3: `isKoreanCoord` 구현**

```typescript
// src/lib/kma.ts
import type { HourlyForecast, SkyCondition, PrecipType } from "./weather-types"

/** 한국 좌표 범위 판정 */
export function isKoreanCoord(lat: number, lng: number): boolean {
  return lat >= 33 && lat <= 38 && lng >= 125 && lng <= 132
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
bun run test
```
Expected: isKoreanCoord 4개 PASS

### 2-B: `latLngToGrid` 테스트 → 구현

- [ ] **Step 5: 테스트 추가** (`weather.test.ts` 에 append)

```typescript
describe("latLngToGrid", () => {
  it("서울 시청 좌표를 기상청 격자로 변환", () => {
    // 서울 시청: lat 37.5665, lng 126.9780 → 기상청 공식 nx=60, ny=127
    const { nx, ny } = latLngToGrid(37.5665, 126.9780)
    expect(nx).toBe(60)
    expect(ny).toBe(127)
  })
  it("부산 중구 좌표를 격자로 변환", () => {
    // 부산 중구: lat 35.1028, lng 129.0323 → nx=98, ny=76
    const { nx, ny } = latLngToGrid(35.1028, 129.0323)
    expect(nx).toBe(98)
    expect(ny).toBe(76)
  })
})
```

- [ ] **Step 6: `latLngToGrid` 구현** (기상청 공개 Lambert Conformal Conic 변환식)

```typescript
/** 위경도 → 기상청 격자 좌표 변환 (Lambert Conformal Conic) */
export function latLngToGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877     // 지구 반경 (km)
  const GRID = 5.0          // 격자 간격 (km)
  const SLAT1 = 30.0        // 투영 위도1 (degree)
  const SLAT2 = 60.0        // 투영 위도2 (degree)
  const OLON = 126.0        // 기준점 경도 (degree)
  const OLAT = 38.0         // 기준점 위도 (degree)
  const XO = 43             // 기준점 X좌표 (격자)
  const YO = 136            // 기준점 Y좌표 (격자)

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
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
bun run test
```
Expected: latLngToGrid 2개 PASS

### 2-C: `getKmaBaseTime` 테스트 → 구현

- [ ] **Step 8: 테스트 추가**

```typescript
describe("getKmaBaseTime", () => {
  it("오전 7시는 0500 회차 사용", () => {
    const d = new Date("2026-04-15T07:00:00+09:00")
    const { base_date, base_time } = getKmaBaseTime(d)
    expect(base_date).toBe("20260415")
    expect(base_time).toBe("0500")
  })
  it("오전 2시 30분은 전날 2300 회차 사용", () => {
    const d = new Date("2026-04-15T02:30:00+09:00")
    const { base_date, base_time } = getKmaBaseTime(d)
    expect(base_date).toBe("20260414")
    expect(base_time).toBe("2300")
  })
  it("오후 14시는 1100 회차 사용", () => {
    const d = new Date("2026-04-15T14:00:00+09:00")
    const { base_date, base_time } = getKmaBaseTime(d)
    expect(base_date).toBe("20260415")
    expect(base_time).toBe("1100")
  })
})
```

- [ ] **Step 9: `getKmaBaseTime` 구현**

```typescript
/**
 * 현재 시각 기준으로 사용할 기상청 단기예보 발표 회차를 반환한다.
 * 발표 시각: 0200 0500 0800 1100 1400 1700 2000 2300
 * 발표 후 약 10분 뒤부터 데이터 제공되므로 여유 있게 이전 회차 사용.
 */
export function getKmaBaseTime(now: Date): { base_date: string; base_time: string } {
  // KST 시간으로 계산
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const hour = kst.getUTCHours()
  const minute = kst.getUTCMinutes()
  const totalMin = hour * 60 + minute

  // 발표 회차 기준 시각 (분)
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

  // 현재 시각보다 이전인 가장 최근 회차 찾기
  let selectedTime = "2300"
  let dateOffset = 0  // 0 = 오늘, -1 = 전날

  const passed = baseTimes.filter((b) => totalMin >= b.min)
  if (passed.length === 0) {
    // 당일 첫 회차(0200)보다 이른 시각 → 전날 2300 사용
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
```

### 2-D: `skyFromKma`, `precipFromKma` 테스트 → 구현

- [ ] **Step 10: 테스트 추가**

```typescript
describe("skyFromKma / precipFromKma", () => {
  it("SKY=1 → CLEAR", () => expect(skyFromKma("1")).toBe("CLEAR"))
  it("SKY=3 → PARTLY_CLOUDY", () => expect(skyFromKma("3")).toBe("PARTLY_CLOUDY"))
  it("SKY=4 → CLOUDY", () => expect(skyFromKma("4")).toBe("CLOUDY"))
  it("SKY=unknown → CLOUDY fallback", () => expect(skyFromKma("9")).toBe("CLOUDY"))

  it("PTY=0 → NONE", () => expect(precipFromKma("0")).toBe("NONE"))
  it("PTY=1 → RAIN", () => expect(precipFromKma("1")).toBe("RAIN"))
  it("PTY=3 → SNOW", () => expect(precipFromKma("3")).toBe("SNOW"))
  it("PTY=2 → RAIN_SNOW", () => expect(precipFromKma("2")).toBe("RAIN_SNOW"))
})
```

- [ ] **Step 11: `skyFromKma`, `precipFromKma` 구현**

```typescript
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
    case "4": return "RAIN"    // 소나기
    default:  return "NONE"
  }
}
```

- [ ] **Step 12: 전체 테스트 통과 확인**

```bash
bun run test
```
Expected: 전체 테스트 PASS (기존 + 새 weather 테스트 포함)

- [ ] **Step 13: 커밋**

```bash
git add src/lib/kma.ts src/test/weather.test.ts
git commit -m "feat: kma pure utils — isKoreanCoord, latLngToGrid, getKmaBaseTime, skyFromKma, precipFromKma"
```

---

## Task 3: 기상청 단기예보 fetch + 파싱

**Files:**
- Modify: `src/lib/kma.ts` (fetchKmaForecast 추가)

- [ ] **Step 1: `fetchKmaForecast` 구현** (`kma.ts` 에 추가)

```typescript
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

    // targetDate의 날짜 문자열 (YYYYMMDD)
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
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/kma.ts
git commit -m "feat: fetchKmaForecast — 기상청 단기예보 fetch + 파싱"
```

---

## Task 4: Kakao Geocoding

**Files:**
- Create: `src/lib/geocoding.ts`

- [ ] **Step 1: 구현**

```typescript
// src/lib/geocoding.ts

/**
 * 주소 문자열을 Kakao REST API로 위경도로 변환한다.
 * 실패 시 null 반환 (throw 없음).
 */
export async function geocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.KAKAO_REST_API_KEY
    if (!apiKey) return null

    const url = new URL("https://dapi.kakao.com/v2/local/search/address.json")
    url.searchParams.set("query", address)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null

    const json = await res.json()
    const doc = json?.documents?.[0]
    if (!doc) return null

    const lat = parseFloat(doc.y)
    const lng = parseFloat(doc.x)
    if (isNaN(lat) || isNaN(lng)) return null

    return { lat, lng }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/geocoding.ts
git commit -m "feat: geocoding — Kakao 주소→좌표 변환"
```

---

## Task 5: Open-Meteo fetch + `fetchWeather` 오케스트레이터

**Files:**
- Create: `src/lib/weather.ts`

- [ ] **Step 1: 구현**

```typescript
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
        windSpeed: Math.round((windspeed_10m[i] ?? 0) / 3.6 * 10) / 10, // km/h → m/s
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
  // 대표 날씨: 06~21시 중 가장 흐린 하늘 상태
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
```

- [ ] **Step 2: 테스트 파일에 `summarize` 간접 테스트 추가** (순수 로직 확인)

```typescript
// src/test/weather.test.ts 에 추가
import { skyFromKma } from "@/lib/kma"

describe("skyFromKma — 경계값", () => {
  it("빈 문자열 → CLOUDY fallback", () => {
    expect(skyFromKma("")).toBe("CLOUDY")
  })
})
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
bun run test
```
Expected: 전체 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/lib/weather.ts src/test/weather.test.ts
git commit -m "feat: weather.ts — Open-Meteo + fetchWeather 오케스트레이터"
```

---

## Task 6: WeatherBadge 컴포넌트

**Files:**
- Create: `src/components/weather-badge.tsx`

- [ ] **Step 1: 구현**

```typescript
// src/components/weather-badge.tsx
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
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/weather-badge.tsx
git commit -m "feat: WeatherBadge — 목록용 날씨 배지 컴포넌트"
```

---

## Task 7: WeatherForecast 컴포넌트

**Files:**
- Create: `src/components/weather-forecast.tsx`

- [ ] **Step 1: 구현**

```typescript
// src/components/weather-forecast.tsx
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
  // 06~19시, 3시간 간격
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
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/weather-forecast.tsx
git commit -m "feat: WeatherForecast — 시간별 날씨 카드 컴포넌트"
```

---

## Task 8: 스케줄 목록 페이지에 WeatherBadge 통합

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/page.tsx`

현재 파일 구조:
- Server Component
- `schedule.shootingDays` 배열을 map으로 렌더링
- 각 촬영일 카드 오른쪽에 `{day._count.sceneStatuses}씬` 표시

- [ ] **Step 1: import 추가 및 날씨 병렬 호출**

파일 상단 import 블록에 추가:
```typescript
import { fetchWeather } from "@/lib/weather"
import { WeatherBadge } from "@/components/weather-badge"
```

`if (!schedule) notFound()` 바로 아래에 추가:
```typescript
// 날씨 병렬 호출 — 일부 실패해도 전체 목록 렌더 보장
const weatherResults = await Promise.allSettled(
  schedule.shootingDays.map((day) => fetchWeather(day.location, day.date))
)
const weatherMap = new Map(
  schedule.shootingDays.map((day, i) => {
    const result = weatherResults[i]
    return [day.id, result.status === "fulfilled" ? result.value : null]
  })
)
```

- [ ] **Step 2: WeatherBadge 렌더**

촬영일 카드의 `<div className="flex items-center gap-3 text-xs text-gray-400">` 블록에서 `<span>{day._count.sceneStatuses}씬</span>` 앞에 추가:
```typescript
{weatherMap.get(day.id) && (
  <WeatherBadge forecast={weatherMap.get(day.id)!} />
)}
```

- [ ] **Step 3: 테스트 확인**

```bash
bun run test
```
Expected: 전체 PASS

- [ ] **Step 4: 커밋**

```bash
git add "src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/page.tsx"
git commit -m "feat: 스케줄 목록에 날씨 배지 표시"
```

---

## Task 9: 촬영일 상세 페이지에 WeatherForecast 통합

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx`

- [ ] **Step 1: import 추가 + 날씨 호출**

파일 상단 import에 추가:
```typescript
import { fetchWeather } from "@/lib/weather"
import { WeatherForecast } from "@/components/weather-forecast"
```

`if (!day) notFound()` 바로 아래에 추가:
```typescript
// 과거 날짜는 날씨 예보 불필요
const today = new Date()
today.setHours(0, 0, 0, 0)
const isPast = new Date(day.date) < today
const weather = isPast ? null : await fetchWeather(day.location, day.date)
```

- [ ] **Step 2: WeatherForecast 렌더**

`<ShootingDayClient .../>` 바로 위, 헤더 `</div>` 닫은 직후에 추가:
```tsx
{weather && day.location && (
  <WeatherForecast forecast={weather} location={day.location} />
)}
```

- [ ] **Step 3: 테스트 확인**

```bash
bun run test
```
Expected: 전체 PASS

- [ ] **Step 4: 커밋**

```bash
git add "src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx"
git commit -m "feat: 촬영일 상세에 시간별 날씨 예보 표시"
```

---

## Task 10: 환경 변수 문서화

**Files:**
- Modify: `.env.example` (없으면 생성)

- [ ] **Step 1: `.env.example` 에 날씨 API 키 항목 추가**

```bash
# .env.example 에 아래 두 줄 추가
KAKAO_REST_API_KEY=             # Kakao Developers → 내 애플리케이션 → REST API 키
KMA_SERVICE_KEY=                # 공공데이터포털 → 기상청 단기예보 API v2 → 일반 인증키
```

- [ ] **Step 2: TODOS.md 에서 날씨 API 항목 완료 처리**

`TODOS.md` 에서 `### 날씨 API 연동` 섹션을 찾아 `**Status:** Done` 추가 또는 항목 제거.

- [ ] **Step 3: 커밋**

```bash
git add .env.example TODOS.md
git commit -m "chore: 날씨 API 환경변수 문서화 + TODOS 업데이트"
```

---

## 완료 기준

- `bun run test` — 전체 PASS
- `latLngToGrid`, `isKoreanCoord`, `getKmaBaseTime`, `skyFromKma`, `precipFromKma` 단위 테스트 통과
- 스케줄 목록 페이지: 장소 있는 촬영일에 날씨 배지 표시
- 촬영일 상세 페이지: 미래 날짜 촬영일에 시간별 날씨 카드 표시
- 장소 없는 촬영일, API 실패, 과거 날짜 모두 조용히 skip (에러 없음)
