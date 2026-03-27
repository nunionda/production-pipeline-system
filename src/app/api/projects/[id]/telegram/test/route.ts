import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMessage } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: projectId } = await params;
  const { chatId } = (await req.json()) as { chatId: string };

  if (!chatId) return NextResponse.json({ error: "chatId 필수" }, { status: 400 });

  const sent = await sendMessage(
    chatId,
    `✅ 프로덕션 파이프라인 시스템과 연결되었습니다.\n프로젝트 ID: ${projectId}`
  );

  if (sent) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { error: "발송 실패. BOT_TOKEN 또는 Chat ID를 확인해 주세요." },
    { status: 500 }
  );
}
