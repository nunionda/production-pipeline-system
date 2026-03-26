import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PreProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, propCounts, locationCounts] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { characters: true, props: true, costumes: true, locations: true },
        },
      },
    }),
    db.prop.groupBy({
      by: ["status"],
      where: { projectId: id },
      _count: true,
    }),
    db.location.groupBy({
      by: ["status"],
      where: { projectId: id },
      _count: true,
    }),
  ]);

  if (!project) notFound();

  const budgetLines = await db.budgetLine.findMany({
    where: { projectId: id },
    select: { estimatedAmount: true, actualAmount: true },
  });
  const totalEstimated = budgetLines.reduce((s, l) => s + l.estimatedAmount, 0);
  const totalActual = budgetLines.reduce((s, l) => s + l.actualAmount, 0);

  const propAcquired =
    propCounts.find((p) => p.status === "ACQUIRED")?._count ?? 0;
  const locationConfirmed =
    locationCounts.find((l) => l.status === "CONFIRMED")?._count ?? 0;

  function formatKRW(n: number) {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
    if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
    return `${n.toLocaleString()}원`;
  }

  const sections = [
    {
      label: "등장인물",
      href: `/projects/${id}/pre-production/characters`,
      count: project._count.characters,
      detail: `${project._count.characters}명`,
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
    },
    {
      label: "로케이션",
      href: `/projects/${id}/pre-production/locations`,
      count: project._count.locations,
      detail: `${locationConfirmed}/${project._count.locations} 확정`,
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
    },
    {
      label: "소품",
      href: `/projects/${id}/pre-production/props`,
      count: project._count.props,
      detail: `${propAcquired}/${project._count.props} 확보`,
      color: "bg-orange-50 border-orange-200",
      textColor: "text-orange-700",
    },
    {
      label: "의상",
      href: `/projects/${id}/pre-production/costumes`,
      count: project._count.costumes,
      detail: `${project._count.costumes}벌`,
      color: "bg-pink-50 border-pink-200",
      textColor: "text-pink-700",
    },
    {
      label: "예산",
      href: `/projects/${id}/pre-production/budget`,
      count: budgetLines.length,
      detail: budgetLines.length > 0
        ? `${formatKRW(totalActual)} / ${formatKRW(totalEstimated)}`
        : "미설정",
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">프리프로덕션</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {sections.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-lg border p-4 transition-all hover:shadow-sm ${s.color}`}
          >
            <p className={`text-xs font-medium ${s.textColor}`}>{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="mt-1 text-xs text-gray-500">{s.detail}</p>
          </Link>
        ))}
      </div>

      {project._count.characters === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            시나리오를 분석하면 등장인물, 소품, 의상, 로케이션이 자동으로 추출됩니다.
          </p>
          <Link
            href={`/projects/${id}/script`}
            className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
          >
            시나리오 분석하기
          </Link>
        </div>
      )}
    </div>
  );
}
