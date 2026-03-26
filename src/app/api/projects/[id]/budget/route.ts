import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const lines = await db.budgetLine.findMany({
    where: { projectId: id },
    orderBy: [{ category: "asc" }, { description: "asc" }],
  });
  return NextResponse.json(lines);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { category, description, estimatedAmount, actualAmount, phase } = await request.json();
  if (!category?.trim() || !description?.trim() || estimatedAmount == null) {
    return NextResponse.json({ error: "category, description, estimatedAmount 필수" }, { status: 400 });
  }
  const line = await db.budgetLine.create({
    data: {
      projectId: id,
      category: category.trim(),
      description: description.trim(),
      estimatedAmount: Number(estimatedAmount),
      actualAmount: actualAmount != null ? Number(actualAmount) : 0,
      phase: phase || "PRE_PRODUCTION",
    },
  });
  return NextResponse.json(line, { status: 201 });
}
