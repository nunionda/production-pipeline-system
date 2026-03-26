import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const locations = await db.location.findMany({
    where: { projectId: id },
    include: { _count: { select: { scenes: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { name, realName, address, status } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name 필수" }, { status: 400 });
  }
  const location = await db.location.create({
    data: {
      projectId: id,
      name: name.trim(),
      realName: realName?.trim() || null,
      address: address?.trim() || null,
      status: status || "UNCONFIRMED",
    },
    include: { _count: { select: { scenes: true } } },
  });
  return NextResponse.json(location, { status: 201 });
}
