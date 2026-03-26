import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitSceneStatusChanged } from "@/lib/sse-emitter";

// PUT /api/scene-statuses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status, takes, notes } = body;

  const sceneStatus = await db.sceneStatus.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(takes !== undefined && { takes: Number(takes) }),
      ...(notes !== undefined && { notes }),
    },
  });

  // Emit SSE event to all live view clients watching this shooting day
  if (status !== undefined) {
    emitSceneStatusChanged({
      sceneStatusId: sceneStatus.id,
      status: sceneStatus.status,
      shootingDayId: sceneStatus.shootingDayId,
    });
  }

  return NextResponse.json(sceneStatus);
}
