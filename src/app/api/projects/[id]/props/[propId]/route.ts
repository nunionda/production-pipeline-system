import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; propId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { propId } = await params;
  const body = await request.json();
  const data: Record<string, string> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.status) data.status = body.status;
  const prop = await db.prop.update({
    where: { id: propId },
    data,
    include: { _count: { select: { scenes: true } } },
  });
  return NextResponse.json(prop);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { propId } = await params;
  await db.prop.delete({ where: { id: propId } });
  return new NextResponse(null, { status: 204 });
}
