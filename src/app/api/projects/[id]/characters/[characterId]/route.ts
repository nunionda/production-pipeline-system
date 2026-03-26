import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; characterId: string }> };

// PATCH /api/projects/:id/characters/:characterId
export async function PATCH(request: NextRequest, { params }: Params) {
  const { characterId } = await params;
  const { name, description } = await request.json();
  const data: Record<string, string | null> = {};
  if (name?.trim()) data.name = name.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  const character = await db.character.update({
    where: { id: characterId },
    data,
    include: { _count: { select: { scenes: true } } },
  });
  return NextResponse.json(character);
}

// DELETE /api/projects/:id/characters/:characterId
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { characterId } = await params;
  await db.character.delete({ where: { id: characterId } });
  return new NextResponse(null, { status: 204 });
}
