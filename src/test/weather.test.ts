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

describe("latLngToGrid", () => {
  it("서울 시청 좌표를 기상청 격자로 변환", () => {
    // 서울 시청: lat 37.5665, lng 126.9780 → 기상청 공식 nx=60, ny=127
    const { nx, ny } = latLngToGrid(37.5665, 126.9780)
    expect(nx).toBe(60)
    expect(ny).toBe(127)
  })
  it("부산 시청 좌표를 격자로 변환", () => {
    // 부산 시청: lat 35.1798, lng 129.0750 → nx=98, ny=76
    const { nx, ny } = latLngToGrid(35.1798, 129.0750)
    expect(nx).toBe(98)
    expect(ny).toBe(76)
  })
})

describe("getKmaBaseTime", () => {
  it("오전 7시는 0500 회차 사용", () => {
    const d = new Date("2026-04-15T07:00:00+09:00")
    const { base_date, base_time } = getKmaBaseTime(d)
    expect(base_date).toBe("20260415")
    expect(base_time).toBe("0500")
  })
  it("오전 2시 30분은 0200 회차 사용 (발표 후 30분 경과)", () => {
    const d = new Date("2026-04-15T02:30:00+09:00")
    const { base_date, base_time } = getKmaBaseTime(d)
    expect(base_date).toBe("20260415")
    expect(base_time).toBe("0200")
  })
  it("오전 2시 05분은 전날 2300 회차 사용 (0200 발표 전)", () => {
    const d = new Date("2026-04-15T02:05:00+09:00")
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

describe("skyFromKma — 경계값", () => {
  it("빈 문자열 → CLOUDY fallback", () => {
    expect(skyFromKma("")).toBe("CLOUDY")
  })
})
