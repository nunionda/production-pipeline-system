import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

// POST /api/c/[token]/confirm
// Actor confirms receipt of their call sheet. No auth required (public link).
// Body: { actorName: string }
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;

  const share = await db.callSheetShare.findUnique({ where: { token } });
  if (!share) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다" }, { status: 404 });
  }
  if (share.expiresAt < new Date()) {
    return NextResponse.json({ error: "링크가 만료되었습니다" }, { status: 410 });
  }

  const body = await request.json().catch(() => ({}));
  const { actorName } = body as { actorName?: string };
  if (!actorName || actorName.trim().length === 0) {
    return NextResponse.json({ error: "배우 이름이 필요합니다" }, { status: 400 });
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const confirmation = await db.callSheetConfirmation.create({
    data: {
      shareId: share.id,
      actorName: actorName.trim(),
      ipAddress,
    },
  });

  return NextResponse.json(confirmation, { status: 201 });
}
