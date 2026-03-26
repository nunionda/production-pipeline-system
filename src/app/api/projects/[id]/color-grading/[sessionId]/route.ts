import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; sessionId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { sessionId } = await params;
  const body = await request.json();
  const data: Record<string, string | null | Date> = {};
  if (body.colorist !== undefined) data.colorist = body.colorist?.trim() || null;
  if (body.status) data.status = body.status;
  if (body.sessionDate !== undefined) data.sessionDate = body.sessionDate ? new Date(body.sessionDate) : null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  const session = await db.colorGradingSession.update({ where: { id: sessionId }, data });
  return NextResponse.json(session);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { sessionId } = await params;
  await db.colorGradingSession.delete({ where: { id: sessionId } });
  return new NextResponse(null, { status: 204 });
}
