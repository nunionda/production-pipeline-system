import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdConfirmSection } from "./ad-confirm-section";

const STATUS_LABELS: Record<string, string> = {
  WAITING: "대기",
  SHOOTING: "촬영중",
  COMPLETED: "완료",
  RESHOOT: "재촬영",
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-gray-100 text-gray-600",
  SHOOTING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  RESHOOT: "bg-amber-100 text-amber-700",
};

export default async function ADDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [project, todayDay, tomorrowDay, pendingProps, unconfirmedLocations, todayShares] =
    await Promise.all([
      db.project.findUnique({
        where: { id },
        select: { title: true, phase: true },
      }),
      db.shootingDay.findFirst({
        where: {
          schedule: { projectId: id },
          date: { gte: today, lt: tomorrow },
        },
        include: {
          schedule: { select: { id: true } },
          sceneStatuses: {
            include: {
              scene: { select: { number: true, location: true, intExt: true } },
            },
            orderBy: { scene: { number: "asc" } },
          },
        },
      }),
      db.shootingDay.findFirst({
        where: {
          schedule: { projectId: id },
          date: { gte: tomorrow },
        },
        orderBy: { date: "asc" },
        include: {
          schedule: { select: { id: true } },
          sceneStatuses: {
            include: { scene: { select: { number: true, location: true } } },
            take: 5,
          },
        },
      }),
      db.prop.count({ where: { projectId: id, status: "UNACQUIRED" } }),
      db.location.count({ where: { projectId: id, status: "UNCONFIRMED" } }),
      db.callSheetShare.findMany({
        where: {
          shootingDay: {
            schedule: { projectId: id },
            date: { gte: today, lt: tomorrow },
          },
        },
        include: {
          confirmations: {
            select: { actorName: true, actorRole: true, confirmedAt: true },
            orderBy: { confirmedAt: "asc" },
          },
          callSheet: { select: { cast: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

  if (!project) notFound();

  const todayFormatted = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">조감독 대시보드</h2>
        <p className="mt-0.5 text-sm text-gray-500">{todayFormatted}</p>
      </div>

      {/* 오늘 촬영 */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          오늘 촬영
        </h3>
        {todayDay ? (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {/* Day meta */}
            <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
              {todayDay.location && (
                <span className="text-sm font-medium text-gray-900">
                  {todayDay.location}
                </span>
              )}
              {todayDay.callTime && (
                <span className="text-xs text-gray-500">
                  콜타임 {todayDay.callTime}
                </span>
              )}
              <Link
                href={`/projects/${id}/schedule/${todayDay.schedule.id}/day/${todayDay.id}`}
                className="ml-auto text-xs text-primary-800 hover:underline"
              >
                상세 보기
              </Link>
            </div>
            {/* Scene list */}
            {todayDay.sceneStatuses.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {todayDay.sceneStatuses.map((ss) => (
                  <div
                    key={ss.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-gray-900 w-12 flex-shrink-0">
                      S#{ss.scene.number}
                    </span>
                    <span className="text-sm text-gray-600 flex-1 truncate">
                      {ss.scene.location || "—"}
                      {ss.scene.intExt && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({ss.scene.intExt})
                        </span>
                      )}
                    </span>
                    <span
                      className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        STATUS_COLORS[ss.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABELS[ss.status] ?? ss.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                배정된 씬이 없습니다
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center">
            <p className="text-sm text-gray-400">오늘 촬영 없음</p>
          </div>
        )}
      </section>

      {/* 내일 촬영 예정 */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          내일 촬영 예정
        </h3>
        {tomorrowDay ? (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-900">
                {formatDate(tomorrowDay.date)}
              </span>
              {tomorrowDay.location && (
                <span className="text-sm text-gray-600">{tomorrowDay.location}</span>
              )}
              <Link
                href={`/projects/${id}/schedule/${tomorrowDay.schedule.id}/day/${tomorrowDay.id}`}
                className="ml-auto text-xs text-primary-800 hover:underline"
              >
                상세 보기
              </Link>
            </div>
            {tomorrowDay.sceneStatuses.length > 0 && (
              <div className="divide-y divide-gray-100">
                {tomorrowDay.sceneStatuses.map((ss) => (
                  <div
                    key={ss.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-gray-900 w-12 flex-shrink-0">
                      S#{ss.scene.number}
                    </span>
                    <span className="text-sm text-gray-600 truncate">
                      {ss.scene.location || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center">
            <p className="text-sm text-gray-400">예정된 촬영이 없습니다</p>
          </div>
        )}
      </section>

      {/* 콜시트 확인 현황 */}
      {todayShares.length > 0 && (
        <AdConfirmSection
          share={todayShares[0]}
          projectId={id}
          dayId={todayShares[0].shootingDayId}
        />
      )}

      {/* 준비 현황 */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          준비 현황
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* 미확보 소품 */}
          <Link
            href={`/projects/${id}/pre-production/props`}
            className={`rounded-lg border p-4 transition-colors hover:shadow-sm ${
              pendingProps > 0
                ? "border-amber-200 bg-amber-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <p className={`text-xs font-medium ${pendingProps > 0 ? "text-amber-700" : "text-green-700"}`}>
              미확보 소품
            </p>
            <p className={`mt-1 text-2xl font-bold ${pendingProps > 0 ? "text-amber-700" : "text-green-700"}`}>
              {pendingProps}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {pendingProps > 0 ? "확보 필요" : "모두 확보됨"}
            </p>
          </Link>

          {/* 미확인 로케이션 */}
          <Link
            href={`/projects/${id}/pre-production/locations`}
            className={`rounded-lg border p-4 transition-colors hover:shadow-sm ${
              unconfirmedLocations > 0
                ? "border-amber-200 bg-amber-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <p className={`text-xs font-medium ${unconfirmedLocations > 0 ? "text-amber-700" : "text-green-700"}`}>
              미확인 로케이션
            </p>
            <p className={`mt-1 text-2xl font-bold ${unconfirmedLocations > 0 ? "text-amber-700" : "text-green-700"}`}>
              {unconfirmedLocations}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {unconfirmedLocations > 0 ? "확인 필요" : "모두 확인됨"}
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
