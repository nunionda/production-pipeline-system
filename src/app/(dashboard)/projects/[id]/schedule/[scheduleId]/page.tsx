import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { AddShootingDayButton } from "./add-day-button";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string; scheduleId: string }>;
}) {
  const { id, scheduleId } = await params;

  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      shootingDays: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { sceneStatuses: true } },
          callSheets: { select: { id: true }, take: 1 },
          sceneStatuses: {
            include: { scene: { select: { number: true, location: true } } },
            orderBy: { scene: { number: "asc" } },
          },
        },
      },
    },
  });

  if (!schedule) notFound();

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href={`/projects/${id}/schedule`} className="hover:text-gray-700">
              스케줄
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{schedule.title}</span>
          </div>
          <p className="text-xs text-gray-400">총 {schedule.shootingDays.length}일</p>
        </div>
        <AddShootingDayButton projectId={id} scheduleId={scheduleId} />
      </div>

      {schedule.shootingDays.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-900">촬영일이 없습니다</p>
          <p className="mt-1 text-sm text-gray-500">
            첫 촬영일을 추가하고 씬을 배정하세요
          </p>
          <AddShootingDayButton
            projectId={id}
            scheduleId={scheduleId}
            className="mt-4"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {schedule.shootingDays.map((day, i) => {
            const d = new Date(day.date);
            const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${weekdays[d.getDay()]})`;
            const hasCallSheet = day.callSheets.length > 0;

            return (
              <Link
                key={day.id}
                href={`/projects/${id}/schedule/${scheduleId}/day/${day.id}`}
                className="flex items-center gap-4 px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
              >
                <div className="text-center w-10">
                  <div className="text-xs font-mono text-blue-700 font-semibold">
                    D+{i + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{dateStr}</span>
                    {hasCallSheet && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" />
                        콜시트
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {day.location || "장소 미정"}
                    </span>
                    {day.sceneStatuses.length > 0 && (
                      <span className="text-xs text-gray-400">
                        씬 {day.sceneStatuses.map((s) => `S${s.scene.number}`).join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{day._count.sceneStatuses}씬</span>
                  <span className="group-hover:text-blue-600">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
