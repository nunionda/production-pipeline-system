import { describe, it, expect } from "vitest"
import {
  buildCallsheetMessage,
  buildDmMessage,
  buildNotifyMessage,
  parseTelegramUpdate,
} from "@/lib/telegram"

// Use a fixed UTC date; local timezone may shift the day-of-week label,
// so tests avoid asserting on the Korean weekday character.
const TEST_DATE = new Date("2026-04-15T00:00:00.000Z")

// ──────────────────────────────────────────────
// buildCallsheetMessage
// ──────────────────────────────────────────────

describe("buildCallsheetMessage", () => {
  const base = {
    projectTitle: "테스트 프로젝트",
    dayNumber: 3,
    date: TEST_DATE,
    sceneNumbers: [1, 2, 5],
    shareUrl: "https://example.com/share/abc",
  }

  it("헤더에 프로젝트 제목과 D+N이 포함된다", () => {
    const msg = buildCallsheetMessage(base)
    expect(msg).toContain("테스트 프로젝트 D+3 콜시트")
  })

  it("날짜 문자열에 연도·월·일이 포함된다", () => {
    const msg = buildCallsheetMessage(base)
    // 2026.04.15 format (local time may shift by ±1 day, but year is stable)
    expect(msg).toContain("2026")
    expect(msg).toMatch(/\d{4}\.\d{2}\.\d{2}/)
  })

  it("씬 번호가 S 접두사와 함께 나열된다", () => {
    const msg = buildCallsheetMessage(base)
    expect(msg).toContain("S1, S2, S5")
  })

  it("씬 개수가 총 N씬으로 표시된다", () => {
    const msg = buildCallsheetMessage(base)
    expect(msg).toContain("총 3씬")
  })

  it("공유 URL이 포함된다", () => {
    const msg = buildCallsheetMessage(base)
    expect(msg).toContain("https://example.com/share/abc")
  })

  it("callTime이 있으면 시간 라인이 포함된다", () => {
    const msg = buildCallsheetMessage({ ...base, callTime: "08:00" })
    expect(msg).toContain("호출 08:00")
  })

  it("shootTime이 있으면 시간 라인이 포함된다", () => {
    const msg = buildCallsheetMessage({ ...base, shootTime: "09:30" })
    expect(msg).toContain("촬영 09:30")
  })

  it("callTime과 shootTime이 모두 있으면 슬래시로 구분된다", () => {
    const msg = buildCallsheetMessage({ ...base, callTime: "08:00", shootTime: "09:30" })
    expect(msg).toContain("호출 08:00 / 촬영 09:30")
  })

  it("callTime/shootTime이 없으면 시간 라인이 없다", () => {
    const msg = buildCallsheetMessage(base)
    expect(msg).not.toContain("호출")
    expect(msg).not.toContain("촬영")
  })

  it("tempMax와 tempMin이 있으면 날씨 라인이 포함된다", () => {
    const msg = buildCallsheetMessage({ ...base, tempMax: 22, tempMin: 10 })
    expect(msg).toContain("22°C / 10°C")
  })

  it("tempMax/tempMin이 없으면 날씨 라인이 없다", () => {
    const msg = buildCallsheetMessage(base)
    expect(msg).not.toContain("°C")
  })

  it("sceneNumbers가 빈 배열이면 '씬: 미정'으로 표시된다", () => {
    const msg = buildCallsheetMessage({ ...base, sceneNumbers: [] })
    expect(msg).toContain("씬: 미정")
  })

  it("location이 있으면 위치 라인이 포함된다", () => {
    const msg = buildCallsheetMessage({ ...base, location: "서울 스튜디오" })
    expect(msg).toContain("서울 스튜디오")
  })

  it("location이 없으면 위치 라인이 없다", () => {
    const msg = buildCallsheetMessage(base)
    expect(msg).not.toContain("📍")
  })
})

// ──────────────────────────────────────────────
// buildDmMessage
// ──────────────────────────────────────────────

describe("buildDmMessage", () => {
  const base = {
    memberName: "홍길동",
    date: TEST_DATE,
    shareUrl: "https://example.com/share/xyz",
  }

  it("멤버 이름이 인사말에 포함된다", () => {
    const msg = buildDmMessage(base)
    expect(msg).toContain("홍길동님")
  })

  it("공유 URL이 포함된다", () => {
    const msg = buildDmMessage(base)
    expect(msg).toContain("https://example.com/share/xyz")
  })

  it("월과 일 정보가 포함된다", () => {
    const msg = buildDmMessage(base)
    // date is 2026-04-15 UTC; local time could be Apr 14 or Apr 15
    // just verify the 월/일 pattern is present
    expect(msg).toMatch(/\d+월 \d+일/)
  })
})

// ──────────────────────────────────────────────
// buildNotifyMessage
// ──────────────────────────────────────────────

describe("buildNotifyMessage", () => {
  it("LOCATION 변경 메시지 형식이 정확하다", () => {
    expect(buildNotifyMessage(5, "LOCATION", "스튜디오 A", "스튜디오 B")).toBe(
      "📢 [D+5] 장소 변경: 스튜디오 A → 스튜디오 B"
    )
  })

  it("CALLTIME 변경 메시지 형식이 정확하다", () => {
    expect(buildNotifyMessage(2, "CALLTIME", "08:00", "09:00")).toBe(
      "⏰ [D+2] 콜타임 변경: 08:00 → 09:00"
    )
  })

  it("WEATHER 변경 메시지 형식이 정확하다", () => {
    expect(buildNotifyMessage(7, "WEATHER", "맑음", "비")).toBe(
      "⚠️ [D+7] 촬영지 날씨 변경: 맑음 → 비"
    )
  })
})

// ──────────────────────────────────────────────
// parseTelegramUpdate
// ──────────────────────────────────────────────

describe("parseTelegramUpdate", () => {
  it("유효한 /start 메시지를 파싱한다 (chat.id 사용)", () => {
    const body = {
      message: {
        chat: { id: 123456 },
        from: { id: 123456 },
        text: "/start",
      },
    }
    const result = parseTelegramUpdate(body)
    expect(result).toEqual({ chatId: 123456, text: "/start" })
  })

  it("그룹 메시지에서 chat.id와 from.id가 다를 때 chat.id를 사용한다", () => {
    const body = {
      message: {
        chat: { id: -100987654 },  // group chat id
        from: { id: 123456 },      // sender id
        text: "hello",
      },
    }
    const result = parseTelegramUpdate(body)
    expect(result).toEqual({ chatId: -100987654, text: "hello" })
  })

  it("message 필드가 없으면 null을 반환한다", () => {
    expect(parseTelegramUpdate({ update_id: 1 })).toBeNull()
  })

  it("chat.id가 없으면 null을 반환한다", () => {
    const body = {
      message: {
        chat: {},
        text: "/start",
      },
    }
    expect(parseTelegramUpdate(body)).toBeNull()
  })

  it("text 필드가 없으면 null을 반환한다", () => {
    const body = {
      message: {
        chat: { id: 123456 },
      },
    }
    expect(parseTelegramUpdate(body)).toBeNull()
  })

  it("null 입력이면 null을 반환한다", () => {
    expect(parseTelegramUpdate(null)).toBeNull()
  })

  it("객체가 아닌 입력이면 null을 반환한다", () => {
    expect(parseTelegramUpdate("not an object")).toBeNull()
    expect(parseTelegramUpdate(42)).toBeNull()
  })
})
