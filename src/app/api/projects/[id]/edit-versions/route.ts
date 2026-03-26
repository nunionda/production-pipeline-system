import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const versions = await db.editVersion.findMany({
    where: { projectId: id },
    orderBy: { versionNumber: "desc" },
  });
  return NextResponse.json(versions);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { editor, status, notes } = await request.json();
  const last = await db.editVersion.findFirst({
    where: { projectId: id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const versionNumber = (last?.versionNumber ?? 0) + 1;
  const version = await db.editVersion.create({
    data: { projectId: id, versionNumber, editor: editor?.trim() || null, status: status || "ROUGH_CUT", notes: notes?.trim() || null },
  });
  return NextResponse.json(version, { status: 201 });
}
