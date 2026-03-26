import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const files = await db.masterFile.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(files);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { name, format, resolution, codec, duration, fileSize, status, notes } = await request.json();
  if (!name?.trim() || !format?.trim()) {
    return NextResponse.json({ error: "name, format 필수" }, { status: 400 });
  }
  const file = await db.masterFile.create({
    data: {
      projectId: id,
      name: name.trim(),
      format: format.trim(),
      resolution: resolution?.trim() || null,
      codec: codec?.trim() || null,
      duration: duration?.trim() || null,
      fileSize: fileSize?.trim() || null,
      status: status || "CREATING",
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(file, { status: 201 });
}
