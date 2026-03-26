import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/projects/[id]/schedules
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const schedules = await db.schedule.findMany({
    where: { projectId: id },
    include: {
      _count: { select: { shootingDays: true } },
      shootingDays: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          date: true,
          location: true,
          callTime: true,
          sortOrder: true,
          _count: { select: { sceneStatuses: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(schedules);
}

// POST /api/projects/[id]/schedules
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title } = body;

  const schedule = await db.schedule.create({
    data: {
      projectId: id,
      title: title?.trim() || "메인 스케줄",
    },
    include: { _count: { select: { shootingDays: true } } },
  });
  return NextResponse.json(schedule, { status: 201 });
}
