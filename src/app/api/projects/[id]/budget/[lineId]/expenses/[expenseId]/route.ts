import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkProjectMembership } from "@/lib/team";

type Params = {
  params: Promise<{ id: string; lineId: string; expenseId: string }>;
};

// DELETE /api/projects/[id]/budget/[lineId]/expenses/[expenseId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, lineId, expenseId } = await params;

  const membership = await checkProjectMembership(db, session.user.id, projectId);
  if (!membership) {
    return NextResponse.json({ error: "프로젝트 접근 권한 없음" }, { status: 403 });
  }

  // Verify lineId belongs to this project
  const budgetLine = await db.budgetLine.findUnique({
    where: { id: lineId },
    select: { projectId: true },
  });
  if (!budgetLine || budgetLine.projectId !== projectId) {
    return NextResponse.json({ error: "예산 항목을 찾을 수 없습니다" }, { status: 404 });
  }

  // Verify expense belongs to this budget line
  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    select: { budgetLineId: true },
  });
  if (!expense || expense.budgetLineId !== lineId) {
    return NextResponse.json({ error: "지출 내역을 찾을 수 없습니다" }, { status: 404 });
  }

  await db.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ ok: true });
}
