import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { buildDoodMatrix } from "@/lib/dood";

type Params = { params: Promise<{ id: string; scheduleId: string }> };

// DOOD status codes
const DOOD_LABEL: Record<string, string> = {
  W: "W",  // Work
  H: "H",  // Hold
};

export default async function DoodPage({ params }: Params) {
  const { id, scheduleId } = await params;

  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      shootingDays: {
        orderBy: { sortOrder: "asc" },
        include: {
          sceneStatuses: {
            include: {
              scene: {
                include: {
                  characters: { include: { character: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!schedule) notFound();

  const project = await db.project.findUnique({
    where: { id },
    select: { title: true },
  });

  // Build DOOD matrix:
  // Row = Character, Column = ShootingDay
  // Cell = "W" (appears in any scene on that day) or "" (absent)

  const days = schedule.shootingDays;

  const { characters, charDaySet } = buildDoodMatrix(days);

  function formatDate(d: Date) {
    return new Date(d).toLocaleDateString("ko-KR", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/projects/${id}/schedule/${scheduleId}`} className="hover:underline">
              스케줄
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Day-out-of-Days</span>
          </div>
          {project && (
            <p className="text-xs text-gray-400 mt-0.5">{project.title}</p>
          )}
        </div>
        <a
          href={`/api/projects/${id}/schedules/${scheduleId}/dood/export`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Excel 내보내기 ↓
        </a>
      </div>

      {characters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-400">등장인물 데이터가 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">시나리오 분석 후 씬에 인물을 배정하면 자동으로 생성됩니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50 min-w-[120px]">
                  등장인물
                </th>
                {days.map((day, i) => (
                  <th
                    key={day.id}
                    className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap min-w-[60px]"
                  >
                    <div className="font-semibold text-gray-700">D{i + 1}</div>
                    <div className="text-[10px]">{formatDate(day.date)}</div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 min-w-[48px]">
                  합계
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {characters.map((char) => {
                const workDays = charDaySet.get(char.id) ?? new Set();
                return (
                  <tr key={char.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">
                      {char.name}
                    </td>
                    {days.map((day) => {
                      const works = workDays.has(day.id);
                      return (
                        <td key={day.id} className="px-2 py-2 text-center">
                          {works ? (
                            <span className="inline-block w-7 rounded text-xs font-bold py-0.5 bg-blue-100 text-blue-800">
                              W
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                      {workDays.size}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 rounded text-center font-bold py-0.5 bg-blue-100 text-blue-800">W</span>
          Work — 촬영 있음
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-gray-300">—</span>
          출연 없음
        </span>
      </div>
    </div>
  );
}
