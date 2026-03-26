import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseScriptFile, detectSceneBoundaries, ScriptParseError } from "@/lib/script-parser";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// GET /api/projects/:id/scripts — list scripts
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scripts = await db.script.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { scenes: true } },
      analysisJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, createdAt: true },
      },
    },
  });
  return NextResponse.json(scripts);
}

// POST /api/projects/:id/scripts — upload + parse script
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify project exists
  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // Parse form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "시나리오";

  if (!file) {
    return NextResponse.json(
      { error: "파일을 선택해 주세요" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "파일 크기가 20MB를 초과합니다" },
      { status: 400 }
    );
  }

  // Read file
  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse text from file
  let parsedText: string;
  try {
    const parsed = await parseScriptFile(buffer, file.name);
    parsedText = parsed.text;
  } catch (error) {
    if (error instanceof ScriptParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "파일을 읽을 수 없습니다" },
      { status: 500 }
    );
  }

  // Save file to disk
  const uploadDir = join(UPLOAD_DIR, id);
  await mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${file.name}`;
  const filePath = join(uploadDir, filename);
  await writeFile(filePath, buffer);

  // Detect approximate scene count
  const estimatedScenes = detectSceneBoundaries(parsedText);

  // Create script record
  const script = await db.script.create({
    data: {
      projectId: id,
      title,
      uploadedFile: filePath,
      parsedText,
      analysisStatus: "PENDING",
    },
  });

  // Create analysis job (will be processed by AI worker in Sprint 1)
  await db.analysisJob.create({
    data: {
      scriptId: script.id,
      status: "PENDING",
    },
  });

  return NextResponse.json(
    {
      id: script.id,
      title: script.title,
      estimatedScenes,
      analysisStatus: script.analysisStatus,
      message: estimatedScenes > 0
        ? `업로드 완료 — 약 ${estimatedScenes}개 씬 감지. AI 분석 대기 중`
        : "업로드 완료 — AI 분석 대기 중",
    },
    { status: 201 }
  );
}
