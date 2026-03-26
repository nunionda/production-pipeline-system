import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { BudgetClient } from "./budget-client";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { title: true } });
  if (!project) notFound();

  const lines = await db.budgetLine.findMany({
    where: { projectId: id },
    orderBy: [{ category: "asc" }, { description: "asc" }],
    include: {
      expenses: { orderBy: { date: "desc" } },
    },
  });

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">예산</h2>
      <BudgetClient projectId={id} initialLines={lines} />
    </div>
  );
}
