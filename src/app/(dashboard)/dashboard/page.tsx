import Link from "next/link";
import { db } from "@/lib/db";
import { StatusBadge, phaseToStatus } from "@/components/status-badge";

export default async function DashboardPage() {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { schedules: true, characters: true } },
    },
  });

  // Gather per-project stats in parallel
  const projectStats = await Promise.all(
    projects.map(async (p) => {
      const [sceneStats, nextDay, budgetLines] = await Promise.all([
        db.sceneStatus.groupBy({
          by: ["status"],
          where: { shootingDay: { schedule: { projectId: p.id } } },
          _count: true,
        }),
        db.shootingDay.findFirst({
          where: {
            schedule: { projectId: p.id },
            date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          orderBy: { date: "asc" },
          select: { date: true },
        }),
        db.budgetLine.findMany({
          where: { projectId: p.id },
          select: { estimatedAmount: true, actualAmount: true },
        }),
      ]);

      const completed = sceneStats.find((s) => s.status === "COMPLETED")?._count ?? 0;
      const total = sceneStats.reduce((s, r) => s + r._count, 0);
      const scenePercent = total > 0 ? Math.round((completed / total) * 100) : null;

      const totalEst = budgetLines.reduce((s, l) => s + l.estimatedAmount, 0);
      const totalAct = budgetLines.reduce((s, l) => s + l.actualAmount, 0);
      const budgetPercent = totalEst > 0 ? Math.round((totalAct / totalEst) * 100) : null;

      return { scenePercent, total, completed, nextDay, budgetPercent };
    })
  );

  const PHASE_LABELS: Record<string, string> = {
    DEVELOPMENT: "기획",
    PRE_PRODUCTION: "프리프로덕션",
    PRODUCTION: "촬영",
    POST_PRODUCTION: "포스트",
    DELIVERY: "납품",
    COMPLETED: "완료",
  };

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  const activeProjects = projects.filter((p) => p.phase !== "COMPLETED");
  const completedProjects = projects.filter((p) => p.phase === "COMPLETED");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-0.5 text-sm text-gray-500">프로덕션 파이프라인 전체 현황</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          새 프로젝트
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
          <h2 className="mt-4 text-lg font-semibold text-gray-900">아직 프로젝트가 없습니다</h2>
          <p className="mt-1 text-sm text-gray-500">첫 프로젝트를 만들어 프로덕션 관리를 시작하세요</p>
          <Link
            href="/projects/new"
            className="mt-6 rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            프로젝트 생성
          </Link>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-surface p-4">
              <p className="text-xs font-medium text-gray-500">전체 프로젝트</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{projects.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-surface p-4">
              <p className="text-xs font-medium text-gray-500">진행 중</p>
              <p className="mt-1 text-2xl font-bold text-primary-800">{activeProjects.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-surface p-4">
              <p className="text-xs font-medium text-gray-500">완료</p>
              <p className="mt-1 text-2xl font-bold text-gray-400">{completedProjects.length}</p>
            </div>
          </div>

          {/* Active projects */}
          {activeProjects.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">진행 중인 프로젝트</h2>
              <div className="space-y-3">
                {activeProjects.map((project, i) => {
                  const stats = projectStats[projects.indexOf(project)];
                  const status = phaseToStatus(project.phase);
                  const nextD = stats.nextDay ? new Date(stats.nextDay.date) : null;
                  const nextDateStr = nextD
                    ? `${nextD.getMonth() + 1}/${nextD.getDate()} (${weekdays[nextD.getDay()]})`
                    : null;
                  const isToday = nextD?.toDateString() === new Date().toDateString();

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block rounded-lg border border-gray-200 bg-surface p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
                            <StatusBadge {...status} />
                          </div>
                          {project.platform && (
                            <p className="text-xs text-gray-500 mt-0.5">{project.platform}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {PHASE_LABELS[project.phase]}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-6">
                        {/* Scene progress */}
                        {stats.total > 0 && (
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>씬 진행률</span>
                              <span>{stats.scenePercent}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-800 rounded-full"
                                style={{ width: `${stats.scenePercent ?? 0}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Budget */}
                        {stats.budgetPercent !== null && (
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>예산 집행</span>
                              <span className={stats.budgetPercent > 100 ? "text-red-600 font-medium" : ""}>
                                {stats.budgetPercent}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${stats.budgetPercent > 100 ? "bg-red-500" : stats.budgetPercent > 80 ? "bg-amber-500" : "bg-green-500"}`}
                                style={{ width: `${Math.min(stats.budgetPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Next shooting day */}
                        {nextDateStr && (
                          <div className="text-xs text-right flex-shrink-0">
                            <p className="text-gray-400">다음 촬영</p>
                            <p className={`font-medium ${isToday ? "text-primary-800" : "text-gray-700"}`}>
                              {isToday ? "오늘" : nextDateStr}
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed projects */}
          {completedProjects.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">완료된 프로젝트</h2>
              <div className="space-y-2">
                {completedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-600">{project.title}</span>
                      {project.platform && (
                        <span className="ml-2 text-xs text-gray-400">{project.platform}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">완료</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
