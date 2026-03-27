import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/projects/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: {
        select: {
          scripts: true,
          characters: true,
          props: true,
          costumes: true,
          locations: true,
          vfxItems: true,
          schedules: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(project);
}

// PATCH /api/projects/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const project = await db.project.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title.trim() }),
      ...(body.format && { format: body.format }),
      ...(body.platform !== undefined && { platform: body.platform?.trim() || null }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.phase && { phase: body.phase }),
      ...(body.startDate && { startDate: new Date(body.startDate) }),
      ...(body.endDate && { endDate: new Date(body.endDate) }),
      ...(body.telegramChatId !== undefined && {
        telegramChatId: body.telegramChatId?.trim() || null,
      }),
    },
  });

  return NextResponse.json(project);
}

// DELETE /api/projects/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
