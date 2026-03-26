import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; targetId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { targetId } = await params;
  const body = await request.json();
  const data: Record<string, string | null | Date> = {};
  if (body.recipientName?.trim()) data.recipientName = body.recipientName.trim();
  if (body.type) data.type = body.type;
  if (body.format !== undefined) data.format = body.format?.trim() || null;
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  const target = await db.deliveryTarget.update({ where: { id: targetId }, data });
  return NextResponse.json(target);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { targetId } = await params;
  await db.deliveryTarget.delete({ where: { id: targetId } });
  return new NextResponse(null, { status: 204 });
}
