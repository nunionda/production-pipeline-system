import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

// POST /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/call-sheet/share
// Create a share token for the call sheet. Returns the share record with token.
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;

  const callSheet = await db.callSheet.findFirst({
    where: { shootingDayId: dayId },
    orderBy: { updatedAt: "desc" },
  });
  if (!callSheet) {
    return NextResponse.json({ error: "콜시트가 없습니다" }, { status: 404 });
  }

  // Expires 24h after shooting day date
  const shootingDay = await db.shootingDay.findUnique({ where: { id: dayId } });
  if (!shootingDay) {
    return NextResponse.json({ error: "촬영일을 찾을 수 없습니다" }, { status: 404 });
  }

  const expiresAt = new Date(shootingDay.date);
  expiresAt.setHours(expiresAt.getHours() + 24);

  const share = await db.callSheetShare.create({
    data: {
      callSheetId: callSheet.id,
      shootingDayId: dayId,
      expiresAt,
    },
  });

  return NextResponse.json(share, { status: 201 });
}

// GET /api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/call-sheet/share
// List all shares for this call sheet with confirmation counts
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;

  const shares = await db.callSheetShare.findMany({
    where: { shootingDayId: dayId },
    include: {
      confirmations: {
        select: { actorName: true, actorRole: true, confirmedAt: true },
        orderBy: { confirmedAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(shares);
}
