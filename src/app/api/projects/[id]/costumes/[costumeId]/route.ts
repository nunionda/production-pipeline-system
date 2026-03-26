import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; costumeId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { costumeId } = await params;
  const body = await request.json();
  const data: Record<string, string | null> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.character !== undefined) data.character = body.character?.trim() || null;
  if (body.status) data.status = body.status;
  const costume = await db.costume.update({
    where: { id: costumeId },
    data,
    include: { _count: { select: { scenes: true } } },
  });
  return NextResponse.json(costume);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { costumeId } = await params;
  await db.costume.delete({ where: { id: costumeId } });
  return new NextResponse(null, { status: 204 });
}
