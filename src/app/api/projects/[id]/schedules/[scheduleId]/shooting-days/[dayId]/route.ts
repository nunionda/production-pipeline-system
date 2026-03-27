import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

// GET /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]
export async function GET(_req: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const day = await db.shootingDay.findUnique({
    where: { id: dayId },
    include: {
      sceneStatuses: {
        include: {
          scene: {
            include: {
              characters: { include: { character: true } },
              props: { include: { prop: true } },
              costumes: { include: { costume: true } },
              locations: { include: { location: true } },
            },
          },
        },
        orderBy: { scene: { number: "asc" } },
      },
      callSheets: { orderBy: { updatedAt: "desc" } },
      dailyReports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!day) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(day);
}

// PUT /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]
export async function PUT(request: NextRequest, { params }: Params) {
  const { id, scheduleId, dayId } = await params;
  const body = await request.json();
  const { date, location, callTime, shootTime, weatherPlan, notes } = body;

  const currentDay = await db.shootingDay.findUnique({
    where: { id: dayId },
    select: { location: true, callTime: true },
  });

  const day = await db.shootingDay.update({
    where: { id: dayId },
    data: {
      ...(date && { date: new Date(date) }),
      ...(location !== undefined && { location: location?.trim() || null }),
      ...(callTime !== undefined && { callTime: callTime?.trim() || null }),
      ...(shootTime !== undefined && { shootTime: shootTime?.trim() || null }),
      ...(weatherPlan !== undefined && { weatherPlan: weatherPlan?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
  });

  // 텔레그램 알림 (비동기, 실패해도 응답에 영향 없음)
  void (async () => {
    try {
      const { sendMessage, buildNotifyMessage } = await import("@/lib/telegram");
      const proj = await db.project.findUnique({
        where: { id },
        select: { telegramChatId: true },
      });
      if (proj?.telegramChatId) {
        const allDays = await db.shootingDay.findMany({
          where: { scheduleId },
          orderBy: { date: "asc" },
          select: { id: true },
        });
        const dayNum = allDays.findIndex((d) => d.id === dayId) + 1;

        if (body.location !== undefined && currentDay?.location && body.location !== currentDay.location) {
          void sendMessage(
            proj.telegramChatId,
            buildNotifyMessage(dayNum, "LOCATION", currentDay.location, body.location)
          );
        }
        if (body.callTime !== undefined && currentDay?.callTime && body.callTime !== currentDay.callTime) {
          void sendMessage(
            proj.telegramChatId,
            buildNotifyMessage(dayNum, "CALLTIME", currentDay.callTime, body.callTime)
          );
        }
      }
    } catch (err) {
      console.error("[shooting-day PUT] telegram notify 실패:", err);
    }
  })();

  return NextResponse.json(day);
}

// DELETE /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { dayId } = await params;
  await db.shootingDay.delete({ where: { id: dayId } });
  return NextResponse.json({ ok: true });
}
