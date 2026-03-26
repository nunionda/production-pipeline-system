import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const props = await db.prop.findMany({
    where: { projectId: id },
    include: { _count: { select: { scenes: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(props);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { name, status } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name 필수" }, { status: 400 });
  }
  const prop = await db.prop.create({
    data: { projectId: id, name: name.trim(), status: status || "UNACQUIRED" },
    include: { _count: { select: { scenes: true } } },
  });
  return NextResponse.json(prop, { status: 201 });
}
