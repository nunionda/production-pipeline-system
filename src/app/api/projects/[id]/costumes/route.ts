import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const costumes = await db.costume.findMany({
    where: { projectId: id },
    include: { _count: { select: { scenes: true } } },
    orderBy: [{ character: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(costumes);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { name, character, status } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name 필수" }, { status: 400 });
  }
  const costume = await db.costume.create({
    data: {
      projectId: id,
      name: name.trim(),
      character: character?.trim() || null,
      status: status || "PREPARING",
    },
    include: { _count: { select: { scenes: true } } },
  });
  return NextResponse.json(costume, { status: 201 });
}
