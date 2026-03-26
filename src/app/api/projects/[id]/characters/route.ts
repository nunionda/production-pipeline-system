import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id/characters
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const characters = await db.character.findMany({
    where: { projectId: id },
    include: { _count: { select: { scenes: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(characters);
}

// POST /api/projects/:id/characters
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { name, description } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name 필수" }, { status: 400 });
  }
  const character = await db.character.create({
    data: { projectId: id, name: name.trim(), description: description?.trim() || null },
    include: { _count: { select: { scenes: true } } },
  });
  return NextResponse.json(character, { status: 201 });
}
