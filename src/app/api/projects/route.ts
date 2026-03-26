import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/projects — list all projects
export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { members: true, scripts: true } },
    },
  });
  return NextResponse.json(projects);
}

// POST /api/projects — create new project
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, format, platform, description } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { error: "프로젝트 제목은 필수입니다" },
      { status: 400 }
    );
  }

  const project = await db.project.create({
    data: {
      title: title.trim(),
      format: format || "DRAMA",
      platform: platform?.trim() || null,
      description: description?.trim() || null,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
