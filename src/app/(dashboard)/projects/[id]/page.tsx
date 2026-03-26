import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PhaseTabs } from "@/components/phase-tabs";
import { StatusBadge, phaseToStatus } from "@/components/status-badge";
import { ArchiveButton } from "./archive-button";
import { getActualAmount } from "@/lib/budget";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: { members: true, scripts: true, characters: true, props: true, locations: true, schedules: true },
      },
    },
  });
  if (!project) notFound();

  // Parallel data fetch for dashboard
  const [
    sceneStats,
    upcomingDays,
    recentFieldChanges,
    recentAssetLogs,
    budgetLines,
    reshootScenes,
    damagedAssets,
    unconfirmedLocations,
    unacquiredProps,
    qcFailed,
    deliveryRejected,
    editStatus,
  ] = await Promise.all([
    // Scene completion stats
    db.sceneStatus.groupBy({
      by: ["status"],
      where: { shootingDay: { schedule: { projectId: id } } },
      _count: true,
    }),
    // Next 3 shooting days
    db.shootingDay.findMany({
      where: {
        schedule: { projectId: id },
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        schedule: { select: { id: true } },
        sceneStatuses: {
          where: { status: { in: ["WAITING", "SHOOTING"] } },
          include: { scene: { select: { number: true, location: true } } },
          take: 3,
        },
      },
      orderBy: { date: "asc" },
      take: 3,
    }),
    // Recent field changes (last 5)
    db.fieldChange.findMany({
      where: { shootingDay: { schedule: { projectId: id } } },
      include: { scene: { select: { number: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Recent asset damage/loss logs
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
    // Budget summary
    db.budgetLine.findMany({
      where: { projectId: id },
      select: {
        category: true,
        estimatedAmount: true,
        actualAmount: true,
        expenses: { select: { amount: true } },
      },
    }),
    // Reshoot scenes count
    db.sceneStatus.count({
      where: {
        status: "RESHOOT",
        shootingDay: { schedule: { projectId: id } },
      },
    }),
    // Damaged/lost assets count
    db.dailyAssetLog.count({
      where: {
        shootingDay: { schedule: { projectId: id } },
        assetStatus: { in: ["DAMAGED", "LOST"] },
      },
    }),
    // Unconfirmed locations with scenes assigned to upcoming days
    db.location.count({
      where: { projectId: id, status: "UNCONFIRMED" },
    }),
    // Unacquired props
    db.prop.count({
      where: { projectId: id, status: "UNACQUIRED" },
    }),
    // Failed QC
    db.qCReport.count({ where: { projectId: id, status: "FAILED" } }),
    // Rejected deliveries
    db.deliveryTarget.count({ where: { projectId: id, status: "REJECTED" } }),
    // Latest edit version status
    db.editVersion.findFirst({
      where: { projectId: id },
      orderBy: { versionNumber: "desc" },
      select: { status: true, versionNumber: true },
    }),
  ]);

  const completedScenes = sceneStats.find((s) => s.status === "COMPLETED")?._count ?? 0;
  const reshootScenesCount = sceneStats.find((s) => s.status === "RESHOOT")?._count ?? 0;
  const totalScenes = sceneStats.reduce((s, r) => s + r._count, 0);
  const scenePercent = totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0;

  const totalEstimated = budgetLines.reduce((s, l) => s + l.estimatedAmount, 0);
  const totalActual = budgetLines.reduce((s, l) => s + getActualAmount(l), 0);
  const budgetPercent = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;

  // Category-level overruns
  const categoryMap = new Map<string, { estimated: number; actual: number }>();
  for (const l of budgetLines) {
    const cur = categoryMap.get(l.category) ?? { estimated: 0, actual: 0 };
    categoryMap.set(l.category, { estimated: cur.estimated + l.estimatedAmount, actual: cur.actual + getActualAmount(l) });
  }
  const overrunCategories = [...categoryMap.entries()]
    .filter(([, v]) => v.estimated > 0 && v.actual > v.estimated)
    .map(([cat, v]) => ({ cat, pct: Math.round(((v.actual - v.estimated) / v.estimated) * 100) }));

  function formatKRW(n: number) {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
    if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
    return `${n.toLocaleString()}`;
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  const status = phaseToStatus(project.phase);

  // Build alerts
  const alerts: { level: "warn" | "error"; message: string; href?: string }[] = [];
  if (reshootScenes > 0)
    alerts.push({ level: "warn", message: `재촬영 필요 씬 ${reshootScenes}개`, href: `/projects/${id}/production` });
  if (damagedAssets > 0)
    alerts.push({ level: "warn", message: `손상/분실 자산 ${damagedAssets}건`, href: `/projects/${id}/production` });
  if (unconfirmedLocations > 0)
    alerts.push({ level: "warn", message: `미확인 로케이션 ${unconfirmedLocations}곳`, href: `/projects/${id}/pre-production/locations` });
  if (unacquiredProps > 0)
    alerts.push({ level: "warn", message: `미확보 소품 ${unacquiredProps}개`, href: `/projects/${id}/pre-production/props` });
  if (overrunCategories.length > 0)
    alerts.push({ level: "error", message: `예산 초과 — ${overrunCategories.map((c) => `${c.cat} +${c.pct}%`).join(", ")}`, href: `/projects/${id}/pre-production/budget` });
  if (qcFailed > 0)
    alerts.push({ level: "error", message: `QC 불합격 ${qcFailed}건`, href: `/projects/${id}/delivery` });
  if (deliveryRejected > 0)
    alerts.push({ level: "error", message: `납품 반려 ${deliveryRejected}건`, href: `/projects/${id}/delivery` });

  const PHASE_ORDER = ["DEVELOPMENT", "PRE_PRODUCTION", "PRODUCTION", "POST_PRODUCTION", "DELIVERY", "COMPLETED"];
  const PHASE_LABELS: Record<string, string> = {
    DEVELOPMENT: "기획",
    PRE_PRODUCTION: "프리",
    PRODUCTION: "촬영",
    POST_PRODUCTION: "포스트",
    DELIVERY: "납품",
    COMPLETED: "완료",
  };
  const currentPhaseIdx = PHASE_ORDER.indexOf(project.phase);

  const EDIT_STATUS_LABELS: Record<string, string> = {
    ROUGH_CUT: "러프컷",
    FINE_CUT: "파인컷",
    PICTURE_LOCK: "픽처락",
    FINAL: "최종",
  };

  return (
    <div>
      {/* Header */}
      <div className="border-b border-gray-200 bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
          <StatusBadge {...status} />
        </div>
        {project.platform && <p className="mt-1 text-sm text-gray-500">{project.platform}</p>}
      </div>

      {/* Phase tabs */}
      <PhaseTabs projectId={project.id} />

      <div className="p-6 space-y-6">

        {/* Phase stepper */}
        <div className="flex items-center gap-0">
          {PHASE_ORDER.filter((p) => p !== "COMPLETED").map((phase, i) => {
            const isDone = PHASE_ORDER.indexOf(phase) < currentPhaseIdx;
            const isCurrent = phase === project.phase;
            return (
              <div key={phase} className="flex items-center flex-1 min-w-0">
                {i > 0 && (
                  <div className={`h-px flex-1 ${isDone ? "bg-primary-800" : "bg-gray-200"}`} />
                )}
                <div className="flex flex-col items-center gap-1 px-2">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    isCurrent ? "bg-primary-800 ring-2 ring-primary-200" :
                    isDone ? "bg-primary-800" : "bg-gray-200"
                  }`} />
                  <span className={`text-xs whitespace-nowrap ${isCurrent ? "font-semibold text-primary-800" : isDone ? "text-gray-600" : "text-gray-400"}`}>
                    {PHASE_LABELS[phase]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">주의 필요</h3>
            <div className="space-y-1.5">
              {alerts.map((alert, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  alert.level === "error"
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-amber-50 border border-amber-200 text-amber-700"
                }`}>
                  <span className="flex-shrink-0">{alert.level === "error" ? "▲" : "○"}</span>
                  <span className="flex-1">{alert.message}</span>
                  {alert.href && (
                    <Link href={alert.href} className="text-xs underline opacity-70 hover:opacity-100 flex-shrink-0">
                      확인
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key stats grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Scene progress */}
          <Link href={`/projects/${id}/production`} className="rounded-lg border border-gray-200 bg-surface p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <p className="text-xs font-medium text-gray-500">씬 촬영 진행률</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{scenePercent}<span className="text-sm text-gray-400">%</span></p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary-800 rounded-full" style={{ width: `${scenePercent}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-400">{completedScenes}/{totalScenes} 완료{reshootScenesCount > 0 && ` · ${reshootScenesCount} 재촬영`}</p>
          </Link>

          {/* Budget */}
          <Link href={`/projects/${id}/pre-production/budget`} className="rounded-lg border border-gray-200 bg-surface p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <p className="text-xs font-medium text-gray-500">예산 집행률</p>
            <p className={`mt-1 text-2xl font-bold ${budgetPercent > 100 ? "text-red-600" : "text-gray-900"}`}>
              {budgetPercent}<span className="text-sm text-gray-400">%</span>
            </p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${budgetPercent > 100 ? "bg-red-500" : budgetPercent > 80 ? "bg-amber-500" : "bg-green-500"}`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {totalEstimated > 0 ? `${formatKRW(totalActual)} / ${formatKRW(totalEstimated)}원` : "예산 미설정"}
            </p>
          </Link>

          {/* Pre-production */}
          <Link href={`/projects/${id}/pre-production`} className="rounded-lg border border-gray-200 bg-surface p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <p className="text-xs font-medium text-gray-500">프리프로덕션</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{project._count.characters}</p>
            <p className="mt-1 text-xs text-gray-400">
              등장인물 · 소품 {project._count.props} · 로케이션 {project._count.locations}
            </p>
          </Link>

          {/* Post status */}
          <Link href={`/projects/${id}/post`} className="rounded-lg border border-gray-200 bg-surface p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <p className="text-xs font-medium text-gray-500">포스트프로덕션</p>
            {editStatus ? (
              <>
                <p className="mt-1 text-base font-bold text-gray-900">
                  {EDIT_STATUS_LABELS[editStatus.status]}
                </p>
                <p className="mt-1 text-xs text-gray-400">v{editStatus.versionNumber}</p>
              </>
            ) : (
              <p className="mt-1 text-2xl font-bold text-gray-400">—</p>
            )}
          </Link>
        </div>

        {/* Upcoming shooting days */}
        {upcomingDays.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">촬영 예정</h3>
            <div className="space-y-2">
              {upcomingDays.map((day, i) => {
                const d = new Date(day.date);
                const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <Link
                    key={day.id}
                    href={`/projects/${id}/schedule/${day.schedule.id}/day/${day.id}`}
                    className="flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${isToday ? "bg-primary-100 text-primary-800" : "bg-gray-100 text-gray-600"}`}>
                        D+{i + 1}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">
                      {isToday ? "오늘 · " : ""}{dateStr}
                    </span>
                    <span className="text-sm text-gray-500 flex-1 truncate">
                      {day.location || "장소 미정"}
                      {day.sceneStatuses.length > 0 && (
                        <span className="text-gray-400 ml-2 text-xs">
                          S#{day.sceneStatuses.map((s) => s.scene.number).join(", S#")}
                          {day.sceneStatuses.length === 3 && "..."}
                        </span>
                      )}
                    </span>
                    {day.callTime && <span className="text-xs text-gray-400 flex-shrink-0">호출 {day.callTime}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent alerts: field changes + asset damage */}
        {(recentFieldChanges.length > 0 || recentAssetLogs.length > 0) && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">최근 현장 기록</h3>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
              {recentAssetLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${log.assetStatus === "LOST" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {log.assetStatus === "LOST" ? "분실" : "손상"}
                  </span>
                  <span className="text-sm text-gray-700">{log.prop?.name ?? log.costume?.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(log.shootingDay.date).toLocaleDateString("ko-KR")}</span>
                </div>
              ))}
              {recentFieldChanges.map((change) => {
                const TYPE_LABELS: Record<string, string> = { DIALOGUE: "대사", BLOCKING: "동선", PROP: "소품", SCENE_ADD: "씬추가", SCENE_DELETE: "씬삭제", OTHER: "기타" };
                return (
                  <div key={change.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {TYPE_LABELS[change.changeType] ?? change.changeType}
                    </span>
                    {change.scene && <span className="text-xs text-gray-400">S#{change.scene.number}</span>}
                    <span className="text-sm text-gray-700 flex-1 truncate">{change.description}</span>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(change.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
          <Link href={`/projects/${id}/script`}
            className="rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
            시나리오 업로드
          </Link>
          <Link href={`/projects/${id}/pre-production`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            프리프로덕션
          </Link>
          <Link href={`/projects/${id}/schedule`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            스케줄 관리
          </Link>
          <Link href={`/projects/${id}/delivery`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            납품 관리
          </Link>
          <Link href={`/projects/${id}/ad`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            조감독 뷰
          </Link>
          <Link href={`/projects/${id}/art`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            미술 현황
          </Link>
          <ArchiveButton projectId={id} isCompleted={project.phase === "COMPLETED"} />
        </div>

      </div>
    </div>
  );
}
