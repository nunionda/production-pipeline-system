import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

// GET /api/.../daily-report
export async function GET(_req: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const report = await db.dailyReport.findFirst({
    where: { shootingDayId: dayId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(report ?? null);
}

// POST /api/.../daily-report — create or update
export async function POST(request: NextRequest, { params }: Params) {
  const { dayId } = await params;
  const body = await request.json();
  const { setupCount, overtimeHours, notes } = body;

  const existing = await db.dailyReport.findFirst({ where: { shootingDayId: dayId } });

  if (existing) {
    const updated = await db.dailyReport.update({
      where: { id: existing.id },
      data: {
        setupCount: setupCount ?? existing.setupCount,
        overtimeHours: overtimeHours ?? existing.overtimeHours,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });
    return NextResponse.json(updated);
  }

  const report = await db.dailyReport.create({
    data: {
      shootingDayId: dayId,
      setupCount: setupCount ?? 0,
      overtimeHours: overtimeHours ?? 0,
      notes: notes ?? null,
    },
  });
  return NextResponse.json(report, { status: 201 });
}
