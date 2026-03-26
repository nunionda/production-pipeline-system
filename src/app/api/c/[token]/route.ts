import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

// GET /api/c/[token]
// Public endpoint — no auth required. Returns call sheet data for sharing.
// Increments viewCount on each request.
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const share = await db.callSheetShare.findUnique({
    where: { token },
    include: {
      callSheet: true,
      shootingDay: {
        select: { date: true, location: true, callTime: true, notes: true },
      },
    },
  });

  if (!share) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다" }, { status: 404 });
  }

  if (share.expiresAt < new Date()) {
    return NextResponse.json({ error: "링크가 만료되었습니다" }, { status: 410 });
  }

  // Increment view count (fire-and-forget, don't block response)
  db.callSheetShare
    .update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  return NextResponse.json(share);
}
