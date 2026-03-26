import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

// GET /api/.../asset-logs
export async function GET(_req: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const logs = await db.dailyAssetLog.findMany({
    where: { shootingDayId: dayId },
    include: {
      prop: { select: { id: true, name: true } },
      costume: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(logs);
}

// POST /api/.../asset-logs
export async function POST(request: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const body = await request.json();
  const { propId, costumeId, assetStatus, notes } = body;

  if (!propId && !costumeId) {
    return NextResponse.json({ error: "propId 또는 costumeId 필수" }, { status: 400 });
  }

  const log = await db.dailyAssetLog.create({
    data: {
      shootingDayId: dayId,
      propId: propId || null,
      costumeId: costumeId || null,
      assetStatus: assetStatus || "READY",
      notes: notes?.trim() || null,
    },
    include: {
      prop: { select: { id: true, name: true } },
      costume: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(log, { status: 201 });
}
