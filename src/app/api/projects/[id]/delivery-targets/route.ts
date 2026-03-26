import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const targets = await db.deliveryTarget.findMany({
    where: { projectId: id },
    orderBy: [{ status: "asc" }, { recipientName: "asc" }],
  });
  return NextResponse.json(targets);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { recipientName, type, format, deadline, notes } = await request.json();
  if (!recipientName?.trim() || !type) {
    return NextResponse.json({ error: "recipientName, type 필수" }, { status: 400 });
  }
  const target = await db.deliveryTarget.create({
    data: {
      projectId: id,
      recipientName: recipientName.trim(),
      type,
      format: format?.trim() || null,
      deadline: deadline ? new Date(deadline) : null,
      status: "PENDING",
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(target, { status: 201 });
}
