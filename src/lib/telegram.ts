// src/lib/telegram.ts

const BASE_URL = "https://api.telegram.org/bot";

/** Escape HTML special characters for Telegram parse_mode: "HTML" */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

// ──────────────────────────────────────────────
// Bot API 래퍼
// ──────────────────────────────────────────────

export async function sendMessage(
  chatId: string | number,
  text: string
): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  try {
    const res = await fetch(`${BASE_URL}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      // @ts-expect-error Next.js fetch extension
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendDocument(
  chatId: string | number,
  buffer: Buffer,
  filename: string,
  caption?: string,
  mimeType = "application/pdf"
): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append(
      "document",
      new Blob([buffer], { type: mimeType }),
      filename
    );
    if (caption) form.append("caption", caption);
    const res = await fetch(`${BASE_URL}${token}/sendDocument`, {
      method: "POST",
      body: form,
      // @ts-expect-error Next.js fetch extension
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  try {
    const res = await fetch(`${BASE_URL}${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        ...(secret && { secret_token: secret }),
      }),
      // @ts-expect-error Next.js fetch extension
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// 순수 함수: 메시지 포맷 (테스트 가능)
// ──────────────────────────────────────────────

export type CallsheetMessageData = {
  projectTitle: string;
  dayNumber: number;
  date: Date;
  location?: string | null;
  callTime?: string | null;
  shootTime?: string | null;
  sceneNumbers: number[];
  shareUrl: string;
  tempMax?: number | null;
  tempMin?: number | null;
};

const WEEK_KR = ["일", "월", "화", "수", "목", "금", "토"];

export function buildCallsheetMessage(data: CallsheetMessageData): string {
  const d = data.date;
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${WEEK_KR[d.getDay()]})`;
  const sceneList =
    data.sceneNumbers.length > 0
      ? `씬: ${data.sceneNumbers.map((n) => `S${n}`).join(", ")} (총 ${data.sceneNumbers.length}씬)`
      : "씬: 미정";
  const timeLine =
    data.callTime || data.shootTime
      ? `⏰ ${data.callTime ? `호출 ${data.callTime}` : ""}${data.callTime && data.shootTime ? " / " : ""}${data.shootTime ? `촬영 ${data.shootTime}` : ""}`
      : "";
  const weatherLine =
    data.tempMax != null && data.tempMin != null
      ? `🌤 ${data.tempMax}°C / ${data.tempMin}°C`
      : "";

  const lines = [
    `🎬 ${escapeHtml(data.projectTitle)} D+${data.dayNumber} 콜시트`,
    `📅 ${dateStr}`,
    data.location ? `📍 ${escapeHtml(data.location)}` : "",
    timeLine,
    weatherLine,
    "",
    sceneList,
    "",
    `👉 콜시트 확인: ${data.shareUrl}`,
  ].filter((line, i, arr) => !(line === "" && (i === 0 || arr[i - 1] === "")));

  return lines.join("\n").trim();
}

export type DmMessageData = {
  memberName: string;
  date: Date;
  shareUrl: string;
};

export function buildDmMessage(data: DmMessageData): string {
  const d = data.date;
  const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return [
    `안녕하세요 ${escapeHtml(data.memberName)}님,`,
    `내일(${dateStr}) 촬영 콜시트를 확인해 주세요.`,
    ``,
    `👉 ${data.shareUrl}`,
    ``,
    `위 링크에서 이름 입력 시 확인 처리됩니다.`,
  ].join("\n");
}

export type NotifyChangeType = "LOCATION" | "CALLTIME" | "WEATHER";

export function buildNotifyMessage(
  dayNumber: number,
  changeType: NotifyChangeType,
  oldValue: string,
  newValue: string
): string {
  switch (changeType) {
    case "LOCATION":
      return `📢 [D+${dayNumber}] 장소 변경: ${escapeHtml(oldValue)} → ${escapeHtml(newValue)}`;
    case "CALLTIME":
      return `⏰ [D+${dayNumber}] 콜타임 변경: ${escapeHtml(oldValue)} → ${escapeHtml(newValue)}`;
    case "WEATHER":
      return `⚠️ [D+${dayNumber}] 촬영지 날씨 변경: ${escapeHtml(oldValue)} → ${escapeHtml(newValue)}`;
  }
}

// ──────────────────────────────────────────────
// 순수 함수: Webhook 파싱 (테스트 가능)
// ──────────────────────────────────────────────

export type TelegramUpdate = {
  chatId: number;
  text: string;
};

export function parseTelegramUpdate(body: unknown): TelegramUpdate | null {
  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof (body as Record<string, unknown>).message !== "object"
  ) {
    return null;
  }
  const msg = (body as Record<string, unknown>).message as Record<string, unknown>;
  const chat = msg.chat as Record<string, unknown> | undefined;
  const chatId = chat?.id;
  const text = msg.text;
  if (typeof chatId !== "number" || typeof text !== "string") return null;
  return { chatId, text };
}
