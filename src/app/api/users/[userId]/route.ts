import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ userId: string }> };

// PATCH /api/users/[userId]
// Body: { phone: string }
// Auth: session.user.id must equal userId (self-edit only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  if (session.user?.id !== userId) {
    return NextResponse.json({ error: "본인 정보만 수정할 수 있습니다" }, { status: 403 });
  }

  const body = await req.json();
  const { phone } = body;

  if (typeof phone !== "string") {
    return NextResponse.json({ error: "phone은 문자열이어야 합니다" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { phone: phone.trim() || null },
    select: { id: true, name: true, email: true, phone: true },
  });

  return NextResponse.json(updated);
}
