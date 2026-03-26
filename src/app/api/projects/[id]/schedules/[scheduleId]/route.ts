import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; scheduleId: string }> };

// GET /api/projects/[id]/schedules/[scheduleId]
export async function GET(_req: NextRequest, { params }: Params) {
  const { scheduleId } = await params;
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      shootingDays: {
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
                  characters: { include: { character: { select: { name: true } } } },
                },
              },
            },
          },
          callSheets: { select: { id: true, callTime: true, updatedAt: true } },
        },
      },
    },
  });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(schedule);
}

// PUT /api/projects/[id]/schedules/[scheduleId]
export async function PUT(request: NextRequest, { params }: Params) {
  const { scheduleId } = await params;
  const body = await request.json();
  const schedule = await db.schedule.update({
    where: { id: scheduleId },
    data: { title: body.title?.trim() },
  });
  return NextResponse.json(schedule);
}

// DELETE /api/projects/[id]/schedules/[scheduleId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { scheduleId } = await params;
  await db.schedule.delete({ where: { id: scheduleId } });
  return NextResponse.json({ ok: true });
}
