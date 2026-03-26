import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const tasks = await db.soundTask.findMany({
    where: { projectId: id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { type, description, assignee, status, deadline, notes } = await request.json();
  if (!type) {
    return NextResponse.json({ error: "type 필수" }, { status: 400 });
  }
  const task = await db.soundTask.create({
    data: {
      projectId: id,
      type,
      description: description?.trim() || null,
      assignee: assignee?.trim() || null,
      status: status || "PENDING",
      deadline: deadline ? new Date(deadline) : null,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(task, { status: 201 });
}
