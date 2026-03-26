import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const shots = await db.vFXShot.findMany({
    where: { projectId: id },
    orderBy: [{ status: "asc" }, { shotName: "asc" }],
  });
  return NextResponse.json(shots);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { shotName, description, vendor, status, deadline, notes } = await request.json();
  if (!shotName?.trim()) {
    return NextResponse.json({ error: "shotName 필수" }, { status: 400 });
  }
  const shot = await db.vFXShot.create({
    data: {
      projectId: id,
      shotName: shotName.trim(),
      description: description?.trim() || null,
      vendor: vendor?.trim() || null,
      status: status || "WAITING",
      deadline: deadline ? new Date(deadline) : null,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(shot, { status: 201 });
}
