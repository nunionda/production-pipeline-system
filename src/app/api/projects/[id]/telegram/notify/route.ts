import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMessage, buildNotifyMessage, NotifyChangeType } from "@/lib/telegram";
import { checkProjectMembership } from "@/lib/team";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/telegram/notify
// Body: { dayId: string, changeType: "LOCATION"|"CALLTIME"|"WEATHER", oldValue: string, newValue: string }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const membership = await checkProjectMembership(db, session.user.id, projectId);
  if (!membership) {
    return NextResponse.json({ error: "프로젝트 접근 권한 없음" }, { status: 403 });
  }

  const body = (await req.json()) as {
    dayId: string;
    changeType: NotifyChangeType;
    oldValue: string;
    newValue: string;
  };
  const { dayId, changeType, oldValue, newValue } = body;

  const [project, day] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: { telegramChatId: true },
    }),
    db.shootingDay.findUnique({
      where: { id: dayId },
      select: { scheduleId: true },
    }),
  ]);

  if (!project?.telegramChatId) {
    return NextResponse.json({ ok: false, reason: "no_telegram" });
  }
  if (!day) return NextResponse.json({ error: "촬영일 없음" }, { status: 404 });

  const allDays = await db.shootingDay.findMany({
    where: { scheduleId: day.scheduleId },
    orderBy: { date: "asc" },
    select: { id: true },
  });
  const dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;

  const message = buildNotifyMessage(dayNumber, changeType, oldValue, newValue);
  const sent = await sendMessage(project.telegramChatId, message);

  return NextResponse.json({ ok: sent });
}
