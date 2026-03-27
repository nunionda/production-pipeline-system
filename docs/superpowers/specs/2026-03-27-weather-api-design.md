# 날씨 API 연동 설계

**날짜:** 2026-03-27
**상태:** 승인됨

---

## 목적

촬영일 날씨 예보를 스케줄 목록과 촬영일 상세 페이지에 표시한다.
야외 씬 촬영일에 날씨가 핵심 변수이므로, PD/조감독이 외부 탭 전환 없이 앱 안에서 판단할 수 있도록 한다.

---

## 아키텍처

```
ShootingDay.location (주소 문자열)
        ↓ Kakao Geocoding API → { lat, lng }
        ↓
  한국 좌표 판정 (lat 33~38, lng 125~132)?
       ├─ YES → 기상청 단기예보 API (격자 변환 포함)
       └─ NO  → Open-Meteo API (fallback + 해외 촬영)
        ↓
  Server Component fetch() — next: { revalidate: 3600 }
        ↓
  스케줄 목록: WeatherBadge (아이콘 + 기온)
  촬영일 상세: WeatherForecast (시간별 6h 단위 카드)
```

---

## API 선택 로직

### Kakao Geocoding
- 엔드포인트: `https://dapi.kakao.com/v2/local/search/address.json?query={address}`
- 헤더: `Authorization: KakaoAK {KAKAO_REST_API_KEY}`
- 응답에서 `documents[0].x` (lng), `documents[0].y` (lat) 추출
- 실패 시 null 반환 → 날씨 블록 silent skip

### 기상청 단기예보 API (국내 우선)
- 한국 좌표 판정: `lat ∈ [33, 38]` AND `lng ∈ [125, 132]`
- 격자 변환: Lambert Conformal Conic 공식 (기상청 공개 변환식)
- 엔드포인트: `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`
- 파라미터: `serviceKey`, `numOfRows=300`, `pageNo=1`, `dataType=JSON`, `base_date`, `base_time`, `nx`, `ny`
- `base_time` 결정: API 발표 시각(0200/0500/0800/1100/1400/1700/2000/2300) 중 현재 시각 기준 가장 최근 회차
- 카테고리 파싱: `TMP`(기온), `SKY`(하늘), `PTY`(강수형태), `POP`(강수확률), `WSD`(풍속)
- 촬영 당일 06:00~21:00 범위의 시간별 데이터 추출

### Open-Meteo API (fallback / 해외)
- 엔드포인트: `https://api.open-meteo.com/v1/forecast`
- 파라미터: `latitude`, `longitude`, `hourly=temperature_2m,precipitation_probability,weathercode`, `timezone=Asia/Seoul`, `start_date`, `end_date`
- API 키 불필요

---

## 새 파일

### `src/lib/geocoding.ts`
```typescript
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null>
```
- Kakao REST API 호출
- 결과 없거나 에러 시 null 반환

### `src/lib/kma.ts`
```typescript
// Lambert 격자 변환
export function latLngToGrid(lat: number, lng: number): { nx: number; ny: number }

// 기상청 발표 base_time 계산
export function getBaseTime(date: Date): { base_date: string; base_time: string }

// 단기예보 fetch + 파싱
export async function fetchKmaForecast(lat: number, lng: number, targetDate: Date): Promise<HourlyForecast[]>
```

### `src/lib/weather.ts`
```typescript
export type HourlyForecast = {
  hour: number       // 0~23
  temp: number       // °C
  sky: "CLEAR" | "PARTLY_CLOUDY" | "CLOUDY"
  precip: "NONE" | "RAIN" | "SNOW" | "RAIN_SNOW"
  precipProb: number // 0~100
  windSpeed: number  // m/s
}

export type DayForecast = {
  tempMax: number
  tempMin: number
  summary: HourlyForecast["sky"]
  precipProbMax: number
  hourly: HourlyForecast[]
  source: "KMA" | "OPEN_METEO"
}

// 메인 진입점
export async function fetchWeather(
  location: string | null,
  date: Date
): Promise<DayForecast | null>
```
- `geocode(location)` → 좌표 취득
- 한국 좌표면 `fetchKmaForecast`, 아니면 Open-Meteo fetch
- 어느 단계든 실패하면 null 반환 (에러 throw 없음)

### `src/components/weather-badge.tsx`
- 목록용 컴팩트 컴포넌트
- Props: `forecast: DayForecast`
- 출력: 날씨 이모지 + `최고°C / 최저°C`
- 예: `⛅ 12° / 6°`

### `src/components/weather-forecast.tsx`
- 상세 페이지용 카드 컴포넌트
- Props: `forecast: DayForecast`, `location: string`
- 헤더: 📍 장소명, 대표 날씨, 최고/최저 기온, 최대 강수확률
- 본문: 06시~19시 3시간 단위 시간별 카드 (이모지 + 기온 + 강수확률)

---

## 수정 파일

### `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/page.tsx`
- 각 `ShootingDay`에 대해 `fetchWeather(day.location, day.date)` 병렬 호출
- `Promise.allSettled` 사용 — 일부 실패해도 전체 목록 렌더 보장
- 날씨 성공 시 `<WeatherBadge forecast={...} />` 표시, null이면 렌더 안 함

### `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx`
- `fetchWeather(day.location, day.date)` 호출
- 성공 시 헤더 아래 `<WeatherForecast forecast={...} location={day.location} />` 삽입
- 과거 날짜(`date < today`) 이면 날씨 블록 skip

---

## 환경 변수

```env
KAKAO_REST_API_KEY=...        # Kakao Developers → 내 애플리케이션 → REST API 키
KMA_SERVICE_KEY=...           # 공공데이터포털 → 기상청 단기예보 → 일반 인증키
```

---

## 에러 처리 원칙

- 모든 API 실패는 null 반환 (throw 없음)
- UI는 null이면 날씨 블록 자체를 렌더하지 않음 (에러 메시지 없음)
- 장소명 없는 촬영일 → geocode 호출 안 함 → null
- 과거 날짜 → 상세 페이지에서 날씨 블록 skip

---

## 캐싱

- Next.js `fetch()` + `next: { revalidate: 3600 }` (1시간 캐시)
- `geocode()`, `fetchKmaForecast()`, Open-Meteo 모두 동일 전략 적용
- 별도 DB 테이블 없음

---

## 테스트

- `src/test/weather.test.ts` — `groupHourly()`, `latLngToGrid()`, `isKoreanCoord()` 순수 함수 단위 테스트
- API fetch 함수는 테스트 제외 (외부 의존성)
