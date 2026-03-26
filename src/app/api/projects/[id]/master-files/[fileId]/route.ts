import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { fileId } = await params;
  const body = await request.json();
  const data: Record<string, string | null> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.format?.trim()) data.format = body.format.trim();
  if (body.resolution !== undefined) data.resolution = body.resolution?.trim() || null;
  if (body.codec !== undefined) data.codec = body.codec?.trim() || null;
  if (body.duration !== undefined) data.duration = body.duration?.trim() || null;
  if (body.fileSize !== undefined) data.fileSize = body.fileSize?.trim() || null;
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  const file = await db.masterFile.update({ where: { id: fileId }, data });
  return NextResponse.json(file);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { fileId } = await params;
  await db.masterFile.delete({ where: { id: fileId } });
  return new NextResponse(null, { status: 204 });
}
