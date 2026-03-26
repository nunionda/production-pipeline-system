import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ArtDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, props, costumes, locations, upcomingDays, recentDamage] = await Promise.all([
    db.project.findUnique({ where: { id }, select: { title: true } }),
    db.prop.findMany({ where: { projectId: id }, select: { id: true, name: true, status: true } }),
    db.costume.findMany({ where: { projectId: id }, select: { id: true, name: true, status: true } }),
    db.location.findMany({ where: { projectId: id }, select: { id: true, name: true, status: true } }),
    db.shootingDay.findMany({
      where: {
        schedule: { projectId: id },
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        schedule: { select: { id: true } },
        sceneStatuses: {
          where: { status: { in: ["WAITING", "SHOOTING"] } },
          include: {
            scene: {
              select: {
                number: true,
                props: { include: { prop: { select: { id: true, name: true, status: true } } } },
                costumes: { include: { costume: { select: { id: true, name: true, status: true } } } },
              },
            },
          },
        },
      },
      orderBy: { date: "asc" },
      take: 5,
    }),
    db.dailyAssetLog.findMany({
      where: {
        shootingDay: { schedule: { projectId: id } },
        assetStatus: { in: ["DAMAGED", "LOST"] },
      },
      include: {
        prop: { select: { name: true } },
        costume: { select: { name: true } },
        shootingDay: { select: { date: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!project) notFound();

  // Props
  const propAcquired = props.filter((p) => p.status === "ACQUIRED").length;
  const propNotNeeded = props.filter((p) => p.status === "NOT_NEEDED").length;
  const propEffective = props.length - propNotNeeded;
  const propPercent = propEffective > 0 ? Math.round((propAcquired / propEffective) * 100) : 100;

  // Costumes
  const costumeReady = costumes.filter((c) => c.status === "READY").length;
  const costumePercent = costumes.length > 0 ? Math.round((costumeReady / costumes.length) * 100) : 100;

  // Locations
  const locationConfirmed = locations.filter((l) => l.status === "CONFIRMED").length;
  const locationPercent = locations.length > 0 ? Math.round((locationConfirmed / locations.length) * 100) : 100;

  function progressColor(pct: number) {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-red-500";
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">미술 현황</h2>
        <p className="text-sm text-gray-500 mt-0.5">프로덕션 디자이너 대시보드</p>
      </div>

      {/* 전체 준비율 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">전체 준비율</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 소품 */}
          <Link
            href={`/projects/${id}/pre-production/props`}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <p className="text-xs font-medium text-gray-500">소품</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {propPercent}<span className="text-sm text-gray-400">%</span>
            </p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor(propPercent)}`}
                style={{ width: `${propPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">{propAcquired}/{propEffective} 확보</p>
          </Link>

          {/* 의상 */}
          <Link
            href={`/projects/${id}/pre-production/costumes`}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <p className="text-xs font-medium text-gray-500">의상</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {costumePercent}<span className="text-sm text-gray-400">%</span>
            </p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor(costumePercent)}`}
                style={{ width: `${costumePercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">{costumeReady}/{costumes.length} 완료</p>
          </Link>

          {/* 로케이션 */}
          <Link
            href={`/projects/${id}/pre-production/locations`}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <p className="text-xs font-medium text-gray-500">로케이션</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {locationPercent}<span className="text-sm text-gray-400">%</span>
            </p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor(locationPercent)}`}
                style={{ width: `${locationPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">{locationConfirmed}/{locations.length} 확정</p>
          </Link>
        </div>
      </div>

      {/* 이번 주 필요 아이템 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">이번 주 필요 아이템</h3>
        {upcomingDays.length === 0 ? (
          <p className="text-sm text-gray-400">예정된 촬영이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {upcomingDays.map((day) => {
              const d = new Date(day.date);
              const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;

              // Collect unready props and costumes from all scenes this day
              const pendingProps: { id: string; name: string }[] = [];
              const pendingCostumes: { id: string; name: string }[] = [];

              for (const ss of day.sceneStatuses) {
                for (const sp of ss.scene.props) {
                  if (sp.prop.status !== "ACQUIRED" && sp.prop.status !== "NOT_NEEDED") {
                    if (!pendingProps.find((p) => p.id === sp.prop.id)) {
                      pendingProps.push({ id: sp.prop.id, name: sp.prop.name });
                    }
                  }
                }
                for (const sc of ss.scene.costumes) {
                  if (sc.costume.status !== "READY") {
                    if (!pendingCostumes.find((c) => c.id === sc.costume.id)) {
                      pendingCostumes.push({ id: sc.costume.id, name: sc.costume.name });
                    }
                  }
                }
              }

              const hasIssues = pendingProps.length > 0 || pendingCostumes.length > 0;

              return (
                <div key={day.id} className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">{dateStr}</span>
                  </div>
                  <div className="px-4 py-3">
                    {!hasIssues ? (
                      <p className="text-sm font-medium text-green-600">준비 완료</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingProps.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">소품</p>
                            <div className="flex flex-wrap gap-1.5">
                              {pendingProps.map((p) => (
                                <span
                                  key={p.id}
                                  className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-amber-100 text-amber-800"
                                >
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {pendingCostumes.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">의상</p>
                            <div className="flex flex-wrap gap-1.5">
                              {pendingCostumes.map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-blue-100 text-blue-800"
                                >
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 손상/분실 자산 */}
      {recentDamage.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">손상/분실 자산</h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
            {recentDamage.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    log.assetStatus === "LOST"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {log.assetStatus === "LOST" ? "분실" : "손상"}
                </span>
                <span className="text-sm text-gray-700">{log.prop?.name ?? log.costume?.name}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(log.shootingDay.date).toLocaleDateString("ko-KR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
