import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function ProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!project) notFound();

  const [schedules, sceneStats] = await Promise.all([
    db.schedule.findMany({
      where: { projectId: id },
      include: {
        shootingDays: {
          orderBy: { date: "asc" },
          select: { id: true, date: true, location: true, callTime: true },
        },
        _count: { select: { shootingDays: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.sceneStatus.groupBy({
      by: ["status"],
      where: { shootingDay: { schedule: { projectId: id } } },
      _count: true,
    }),
  ]);

  const completed = sceneStats.find((s) => s.status === "COMPLETED")?._count ?? 0;
  const reshoot = sceneStats.find((s) => s.status === "RESHOOT")?._count ?? 0;
  const total = sceneStats.reduce((s, r) => s + r._count, 0);

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">촬영</h2>
        <Link href={`/projects/${id}/schedule`}
          className="text-xs font-medium text-blue-600 hover:text-blue-800">
          스케줄 관리 →
        </Link>
      </div>

      {/* Scene progress */}
      {total > 0 && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">씬 촬영 진행률</span>
            <span className="font-semibold text-gray-900">{completed}/{total}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-800 rounded-full transition-all"
              style={{ width: total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%" }}
            />
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="text-green-700 font-medium">{completed} 완료</span>
            {reshoot > 0 && <span className="text-amber-600">{reshoot} 재촬영</span>}
            <span>{total - completed - reshoot} 대기/진행중</span>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">아직 촬영 스케줄이 없습니다</p>
          <Link href={`/projects/${id}/schedule/new`}
            className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
            스케줄 생성
          </Link>
        </div>
      ) : (
        schedules.map((schedule) => (
          <div key={schedule.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{schedule.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">총 {schedule._count.shootingDays}일</p>
              </div>
              <Link href={`/projects/${id}/schedule/${schedule.id}`}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                상세 보기 →
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {schedule.shootingDays.slice(0, 5).map((day, i) => {
                const d = new Date(day.date);
                const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
                return (
                  <Link key={day.id}
                    href={`/projects/${id}/schedule/${schedule.id}/day/${day.id}`}
                    className="flex items-center gap-4 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-xs font-mono text-blue-700 w-6 text-right">D+{i + 1}</span>
                    <span className="text-sm text-gray-700 w-24">{dateStr}</span>
                    <span className="text-sm text-gray-500 flex-1 truncate">{day.location || "장소 미정"}</span>
                    {day.callTime && <span className="text-xs text-gray-400">호출 {day.callTime}</span>}
                  </Link>
                );
              })}
              {schedule.shootingDays.length > 5 && (
                <div className="px-4 py-2 text-xs text-gray-400 text-center">
                  +{schedule.shootingDays.length - 5}일 더
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
