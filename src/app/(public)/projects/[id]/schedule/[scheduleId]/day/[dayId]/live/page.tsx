import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { LiveViewClient } from "./live-view-client";

type Params = { params: Promise<{ id: string; scheduleId: string; dayId: string }> };

export default async function LiveViewPage({ params }: Params) {
  const { id, scheduleId, dayId } = await params;

  const day = await db.shootingDay.findUnique({
    where: { id: dayId },
    include: {
      schedule: { select: { id: true, projectId: true } },
      sceneStatuses: {
        include: {
          scene: {
            select: {
              number: true,
              location: true,
              intExt: true,
              timeOfDay: true,
            },
          },
        },
        orderBy: { scene: { number: "asc" } },
      },
    },
  });

  if (!day || day.schedule.projectId !== id || day.schedule.id !== scheduleId) {
    notFound();
  }

  const project = await db.project.findUnique({
    where: { id },
    select: { title: true },
  });

  const shootDate = new Date(day.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <LiveViewClient
      projectTitle={project?.title ?? ""}
      shootDate={shootDate}
      shootLocation={day.location}
      dayId={dayId}
      projectId={id}
      scheduleId={scheduleId}
      initialSceneStatuses={day.sceneStatuses.map((ss) => ({
        id: ss.id,
        status: ss.status,
        scene: ss.scene,
      }))}
    />
  );
}
