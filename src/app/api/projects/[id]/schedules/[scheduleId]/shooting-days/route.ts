import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; scheduleId: string }> };

// GET /api/projects/[id]/schedules/[scheduleId]/shooting-days
export async function GET(_req: NextRequest, { params }: Params) {
  const { scheduleId } = await params;
  const days = await db.shootingDay.findMany({
    where: { scheduleId },
    orderBy: { sortOrder: "asc" },
    include: {
      sceneStatuses: {
        include: {
          scene: {
            select: {
              id: true,
              number: true,
              intExt: true,
              location: true,
              timeOfDay: true,
              pageCount: true,
            },
          },
        },
      },
      callSheets: { select: { id: true, callTime: true } },
      _count: { select: { sceneStatuses: true } },
    },
  });
  return NextResponse.json(days);
}

// POST /api/projects/[id]/schedules/[scheduleId]/shooting-days
export async function POST(request: NextRequest, { params }: Params) {
  const { scheduleId } = await params;
  const body = await request.json();

  const { date, location, callTime, shootTime, weatherPlan, notes } = body;
  if (!date) {
    return NextResponse.json({ error: "날짜는 필수입니다" }, { status: 400 });
  }

  // sortOrder = count of existing days
  const count = await db.shootingDay.count({ where: { scheduleId } });

  const day = await db.shootingDay.create({
    data: {
      scheduleId,
      date: new Date(date),
      location: location?.trim() || null,
      callTime: callTime?.trim() || null,
      shootTime: shootTime?.trim() || null,
      weatherPlan: weatherPlan?.trim() || null,
      notes: notes?.trim() || null,
      sortOrder: count,
    },
    include: {
      sceneStatuses: true,
      _count: { select: { sceneStatuses: true } },
    },
  });
  return NextResponse.json(day, { status: 201 });
}
