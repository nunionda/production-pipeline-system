import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; lineId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { lineId } = await params;
  const body = await request.json();
  const data: Record<string, string | number | null> = {};
  if (body.category?.trim()) data.category = body.category.trim();
  if (body.description?.trim()) data.description = body.description.trim();
  if (body.estimatedAmount != null) data.estimatedAmount = Number(body.estimatedAmount);
  if (body.actualAmount != null) data.actualAmount = Number(body.actualAmount);
  if (body.phase) data.phase = body.phase;
  const line = await db.budgetLine.update({ where: { id: lineId }, data });
  return NextResponse.json(line);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { lineId } = await params;
  await db.budgetLine.delete({ where: { id: lineId } });
  return new NextResponse(null, { status: 204 });
}
