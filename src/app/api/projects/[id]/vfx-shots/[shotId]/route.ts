import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; shotId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { shotId } = await params;
  const body = await request.json();
  const data: Record<string, string | number | null | Date> = {};
  if (body.shotName?.trim()) data.shotName = body.shotName.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.vendor !== undefined) data.vendor = body.vendor?.trim() || null;
  if (body.status) data.status = body.status;
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.revisionCount != null) data.revisionCount = Number(body.revisionCount);
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  const shot = await db.vFXShot.update({ where: { id: shotId }, data });
  return NextResponse.json(shot);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { shotId } = await params;
  await db.vFXShot.delete({ where: { id: shotId } });
  return new NextResponse(null, { status: 204 });
}
