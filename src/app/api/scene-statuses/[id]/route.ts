import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
  return NextResponse.json(sceneStatus);
}
