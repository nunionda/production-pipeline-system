import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ userId: string }> };

// POST /api/users/[userId]/telegram-link
// 6자리 랜덤 코드 생성 후 딥링크 반환
// 권한: 본인 또는 같은 프로젝트의 PD
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  // 본인이거나 공통 프로젝트의 PD인지 확인
  const isSelf = session.user.id === userId;
  if (!isSelf) {
    const sharedProject = await db.projectMember.findFirst({
      where: {
        userId: session.user.id,
        role: "PD",
        project: {
          members: { some: { userId } },
        },
      },
    });
    if (!sharedProject) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // 6자리 랜덤 코드 생성 (영숫자 대문자)
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await db.user.update({
    where: { id: userId },
    data: { telegramLinkCode: code },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_USERNAME 환경 변수가 설정되지 않았습니다" },
      { status: 500 }
    );
  }

  const deepLink = `https://t.me/${botUsername}?start=${code}`;
  return NextResponse.json({ deepLink, code }, { status: 201 });
}
