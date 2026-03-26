import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { versionId } = await params;
  const body = await request.json();
  const data: Record<string, string | null> = {};
  if (body.editor !== undefined) data.editor = body.editor?.trim() || null;
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  const version = await db.editVersion.update({ where: { id: versionId }, data });
  return NextResponse.json(version);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { versionId } = await params;
  await db.editVersion.delete({ where: { id: versionId } });
  return new NextResponse(null, { status: 204 });
}
