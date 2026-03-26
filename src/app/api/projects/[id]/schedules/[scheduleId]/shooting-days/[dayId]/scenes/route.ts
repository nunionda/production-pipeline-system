import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

// POST /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/scenes
// Assign a scene to a shooting day (creates SceneStatus with WAITING)
export async function POST(request: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const { sceneId } = await request.json();

  if (!sceneId) {
    return NextResponse.json({ error: "sceneId 필수" }, { status: 400 });
  }

  // upsert — if already assigned, just return it
  const status = await db.sceneStatus.upsert({
    where: { sceneId_shootingDayId: { sceneId, shootingDayId: dayId } },
    create: { sceneId, shootingDayId: dayId, status: "WAITING" },
    update: {},
    include: { scene: { select: { id: true, number: true, location: true } } },
  });
  return NextResponse.json(status, { status: 201 });
}

// DELETE /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/scenes?sceneId=xxx
export async function DELETE(request: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const { searchParams } = new URL(request.url);
  const sceneId = searchParams.get("sceneId");

  if (!sceneId) {
    return NextResponse.json({ error: "sceneId 필수" }, { status: 400 });
  }

  await db.sceneStatus.delete({
    where: { sceneId_shootingDayId: { sceneId, shootingDayId: dayId } },
  });
  return NextResponse.json({ ok: true });
}
