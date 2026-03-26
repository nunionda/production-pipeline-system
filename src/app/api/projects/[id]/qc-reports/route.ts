import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const reports = await db.qCReport.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reports);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { version, status, technicalSpecs, notes } = await request.json();
  if (!version?.trim()) {
    return NextResponse.json({ error: "version 필수" }, { status: 400 });
  }
  const report = await db.qCReport.create({
    data: {
      projectId: id,
      version: version.trim(),
      status: status || "IN_PROGRESS",
      issues: [],
      technicalSpecs: technicalSpecs?.trim() || null,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(report, { status: 201 });
}
