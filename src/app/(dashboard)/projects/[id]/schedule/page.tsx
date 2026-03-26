import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function SchedulePage({
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

  const schedules = await db.schedule.findMany({
    where: { projectId: id },
    include: {
      _count: { select: { shootingDays: true } },
      shootingDays: {
        orderBy: { date: "asc" },
        select: { id: true, date: true, location: true, callTime: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">촬영 스케줄</h2>
        <ScheduleActions projectId={id} />
      </div>

      {schedules.length === 0 ? (
        <EmptyState projectId={id} />
      ) : (
        schedules.map((schedule) => (
          <ScheduleCard key={schedule.id} schedule={schedule} projectId={id} />
        ))
      )}
    </div>
  );
}

function EmptyState({ projectId }: { projectId: string }) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
      <p className="text-sm font-medium text-gray-900">스케줄이 없습니다</p>
      <p className="mt-1 text-sm text-gray-500">
        촬영 스케줄을 생성하고 씬을 배정하세요
      </p>
      <CreateScheduleButton projectId={projectId} className="mt-4" />
    </div>
  );
}

function ScheduleCard({
  schedule,
  projectId,
}: {
  schedule: {
    id: string;
    title: string;
    _count: { shootingDays: number };
    shootingDays: Array<{
      id: string;
      date: Date;
      location: string | null;
      callTime: string | null;
    }>;
  };
  projectId: string;
}) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{schedule.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            총 {schedule._count.shootingDays}일
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/schedule/${schedule.id}`}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          상세 보기 →
        </Link>
      </div>

      {schedule.shootingDays.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">
          촬영일이 없습니다
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {schedule.shootingDays.slice(0, 5).map((day, i) => {
            const d = new Date(day.date);
            const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
            return (
              <Link
                key={day.id}
                href={`/projects/${projectId}/schedule/${schedule.id}/day/${day.id}`}
                className="flex items-center gap-4 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-mono text-blue-700 w-6 text-right">
                  D+{i + 1}
                </span>
                <span className="text-sm text-gray-700 w-24">{dateStr}</span>
                <span className="text-sm text-gray-500 flex-1 truncate">
                  {day.location || "장소 미정"}
                </span>
                {day.callTime && (
                  <span className="text-xs text-gray-400">
                    호출 {day.callTime}
                  </span>
                )}
              </Link>
            );
          })}
          {schedule.shootingDays.length > 5 && (
            <div className="px-4 py-2 text-xs text-gray-400 text-center">
              +{schedule.shootingDays.length - 5}일 더 있음
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleActions({ projectId }: { projectId: string }) {
  return <CreateScheduleButton projectId={projectId} />;
}

function CreateScheduleButton({
  projectId,
  className = "",
}: {
  projectId: string;
  className?: string;
}) {
  return (
    <Link
      href={`/projects/${projectId}/schedule/new`}
      className={`inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 transition-colors ${className}`}
    >
      + 스케줄 생성
    </Link>
  );
}
