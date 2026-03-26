import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { taskId } = await params;
  const body = await request.json();
  const data: Record<string, string | null | Date> = {};
  if (body.type) data.type = body.type;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.assignee !== undefined) data.assignee = body.assignee?.trim() || null;
  if (body.status) data.status = body.status;
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  const task = await db.soundTask.update({ where: { id: taskId }, data });
  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { taskId } = await params;
  await db.soundTask.delete({ where: { id: taskId } });
  return new NextResponse(null, { status: 204 });
}
