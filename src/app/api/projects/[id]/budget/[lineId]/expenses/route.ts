import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string; lineId: string }> };

// GET /api/projects/[id]/budget/[lineId]/expenses
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lineId } = await params;
  const expenses = await db.expense.findMany({
    where: { budgetLineId: lineId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

// POST /api/projects/[id]/budget/[lineId]/expenses
// Body: { amount: number; note?: string; date: string (ISO) }
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lineId } = await params;
  const body = await request.json();
  const { amount, note, date } = body as { amount?: number; note?: string; date?: string };

  if (!amount || !date) {
    return NextResponse.json({ error: "amount, date는 필수입니다" }, { status: 400 });
  }

  const line = await db.budgetLine.findUnique({ where: { id: lineId } });
  if (!line) return NextResponse.json({ error: "예산 항목을 찾을 수 없습니다" }, { status: 404 });

  const expense = await db.expense.create({
    data: {
      budgetLineId: lineId,
      amount: Number(amount),
      note: note?.trim() || null,
      date: new Date(date),
    },
  });
  return NextResponse.json(expense, { status: 201 });
}
