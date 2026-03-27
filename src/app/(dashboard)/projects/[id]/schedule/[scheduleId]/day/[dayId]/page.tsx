import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ShootingDayClient } from "./shooting-day-client";
import { fetchWeather } from "@/lib/weather";
import { WeatherForecast } from "@/components/weather-forecast";
import { TelegramSendButton } from "./telegram-send-button";
import { CallsheetShareButton } from "./callsheet-share-button";

export default async function ShootingDayPage({
  params,
}: {
  params: Promise<{ id: string; scheduleId: string; dayId: string }>;
}) {
  const { id, scheduleId, dayId } = await params;

  const [project, day, allDays, allScenes, projectProps, projectCostumes] = await Promise.all([
    db.project.findUnique({
      where: { id },
      select: { title: true, telegramChatId: true },
    }),
    db.shootingDay.findUnique({
      where: { id: dayId },
      include: {
        sceneStatuses: {
          include: {
            scene: {
              include: {
                characters: { include: { character: true } },
                props: { include: { prop: true } },
              },
            },
          },
          orderBy: { scene: { number: "asc" } },
        },
        callSheets: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    }),
    db.shootingDay.findMany({
      where: { scheduleId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    }),
    db.scene.findMany({
      where: { script: { projectId: id } },
      orderBy: { number: "asc" },
      select: { id: true, number: true, location: true, intExt: true, timeOfDay: true },
    }),
    db.prop.findMany({
      where: { projectId: id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.costume.findMany({
      where: { projectId: id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!day) notFound();

  // 과거 날짜는 날씨 예보 불필요
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPast = new Date(day.date) < today
  const weather = isPast ? null : await fetchWeather(day.location, day.date)

  const dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const d = new Date(day.date);
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${weekdays[d.getDay()]})`;

  // Scenes not yet assigned to this day
  const assignedSceneIds = new Set(day.sceneStatuses.map((s) => s.sceneId));
  const unassignedScenes = allScenes.filter((s) => !assignedSceneIds.has(s.id));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href={`/projects/${id}/schedule`} className="hover:text-gray-700">
              스케줄
            </Link>
            <span>/</span>
            <Link
              href={`/projects/${id}/schedule/${scheduleId}`}
              className="hover:text-gray-700"
            >
              일정
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">D+{dayNumber}</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{dateStr}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {day.location || "장소 미정"}
            {day.callTime && ` · 호출 ${day.callTime}`}
            {day.shootTime && ` · 촬영 ${day.shootTime}`}
          </p>
        </div>

        {/* Header action buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`/projects/${id}/schedule/${scheduleId}/day/${dayId}/live`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            라이브뷰
          </a>
          <a
            href={`/api/projects/${id}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            콜시트 PDF
          </a>
          <CallsheetShareButton
            projectId={id}
            scheduleId={scheduleId}
            dayId={dayId}
            hasCallSheet={day.callSheets.length > 0}
          />
          <TelegramSendButton
            projectId={id}
            scheduleId={scheduleId}
            dayId={dayId}
            hasTelegramGroup={!!project?.telegramChatId}
          />
        </div>
      </div>

      {weather && day.location && (
        <WeatherForecast forecast={weather} location={day.location} />
      )}

      <ShootingDayClient
        projectId={id}
        scheduleId={scheduleId}
        dayId={dayId}
        day={day}
        unassignedScenes={unassignedScenes}
        projectProps={projectProps}
        projectCostumes={projectCostumes}
      />
    </div>
  );
}
