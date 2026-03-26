import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

// GET /api/.../field-changes
export async function GET(_req: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const changes = await db.fieldChange.findMany({
    where: { shootingDayId: dayId },
    include: { scene: { select: { number: true, location: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(changes);
}

// POST /api/.../field-changes
export async function POST(request: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const body = await request.json();
  const { changeType, description, sceneId, approvedBy } = body;

  if (!changeType || !description?.trim()) {
    return NextResponse.json({ error: "changeType, description 필수" }, { status: 400 });
  }

  const change = await db.fieldChange.create({
    data: {
      shootingDayId: dayId,
      changeType,
      description: description.trim(),
      sceneId: sceneId || null,
      approvedBy: approvedBy?.trim() || null,
    },
    include: { scene: { select: { number: true, location: true } } },
  });
  return NextResponse.json(change, { status: 201 });
}
