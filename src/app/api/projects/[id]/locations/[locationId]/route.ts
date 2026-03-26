import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; locationId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { locationId } = await params;
  const body = await request.json();
  const data: Record<string, string | null> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.realName !== undefined) data.realName = body.realName?.trim() || null;
  if (body.address !== undefined) data.address = body.address?.trim() || null;
  if (body.status) data.status = body.status;
  const location = await db.location.update({
    where: { id: locationId },
    data,
    include: { _count: { select: { scenes: true } } },
  });
  return NextResponse.json(location);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { locationId } = await params;
  await db.location.delete({ where: { id: locationId } });
  return new NextResponse(null, { status: 204 });
}
