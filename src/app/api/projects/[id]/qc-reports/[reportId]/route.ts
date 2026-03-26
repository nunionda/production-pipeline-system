import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; reportId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { reportId } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.version?.trim()) data.version = body.version.trim();
  if (body.status) data.status = body.status;
  if (body.issues !== undefined) data.issues = body.issues;
  if (body.technicalSpecs !== undefined) data.technicalSpecs = body.technicalSpecs?.trim() || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  const report = await db.qCReport.update({ where: { id: reportId }, data });
  return NextResponse.json(report);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { reportId } = await params;
  await db.qCReport.delete({ where: { id: reportId } });
  return new NextResponse(null, { status: 204 });
}
