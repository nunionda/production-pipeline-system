import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMessage } from "@/lib/telegram";
import { checkProjectMembership } from "@/lib/team";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: projectId } = await params;

  const membership = await checkProjectMembership(db, session.user.id, projectId);
  if (!membership) {
    return NextResponse.json({ error: "프로젝트 접근 권한 없음" }, { status: 403 });
  }
  // chatId를 클라이언트가 보내지 않고 프로젝트 DB에서 가져옴
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { telegramChatId: true },
  });
  if (!project?.telegramChatId) {
    return NextResponse.json({ error: "텔레그램 그룹이 연결되지 않았습니다" }, { status: 400 });
  }

  const sent = await sendMessage(
    project.telegramChatId,
    `✅ 프로덕션 파이프라인 시스템과 연결되었습니다.`
  );

  if (sent) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { error: "발송 실패. BOT_TOKEN 또는 Chat ID를 확인해 주세요." },
    { status: 500 }
  );
}
