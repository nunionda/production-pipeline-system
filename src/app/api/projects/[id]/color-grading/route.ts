import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sessions = await db.colorGradingSession.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { colorist, status, sessionDate, notes } = await request.json();
  const session = await db.colorGradingSession.create({
    data: {
      projectId: id,
      colorist: colorist?.trim() || null,
      status: status || "PENDING",
      sessionDate: sessionDate ? new Date(sessionDate) : null,
      notes: notes?.trim() || null,
    },
  });
  return NextResponse.json(session, { status: 201 });
}
