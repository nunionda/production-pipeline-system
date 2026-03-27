import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMessage, parseTelegramUpdate } from "@/lib/telegram";

// POST /api/telegram/webhook
// Telegram Bot API가 호출하는 webhook 엔드포인트
// 항상 200 반환 (텔레그램 재전송 방지)
export async function POST(req: NextRequest) {
  // X-Telegram-Bot-Api-Secret-Token 헤더 검증
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (headerSecret !== secret) {
      // 200 반환해야 Telegram이 재시도하지 않음
      return NextResponse.json({ ok: false }, { status: 200 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const update = parseTelegramUpdate(body);
  if (!update) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { chatId, text } = update;

  // /start <code> 처리
  if (text.startsWith("/start ")) {
    const code = text.slice(7).trim().toUpperCase();
    if (code) {
      try {
        const user = await db.user.findFirst({
          where: { telegramLinkCode: code },
        });
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              telegramChatId: String(chatId),
              telegramLinkCode: null,
            },
          });
          await sendMessage(
            chatId,
            `✅ 연결 완료! 안녕하세요 ${user.name}님, 이제 콜시트 알림을 받을 수 있습니다.`
          );
        } else {
          await sendMessage(chatId, "올바르지 않은 코드입니다. 앱에서 새 링크를 생성해 주세요.");
        }
      } catch (err) {
        console.error("[telegram/webhook] /start 처리 오류:", err);
      }
    }
  }

  // 항상 200 반환
  return NextResponse.json({ ok: true }, { status: 200 });
}
