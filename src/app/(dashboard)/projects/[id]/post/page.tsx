import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PostProductionClient } from "./post-client";

export default async function PostProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { title: true } });
  if (!project) notFound();

  const [editVersions, vfxShots, soundTasks, colorSessions] = await Promise.all([
    db.editVersion.findMany({
      where: { projectId: id },
      orderBy: { versionNumber: "desc" },
    }),
    db.vFXShot.findMany({
      where: { projectId: id },
      orderBy: [{ status: "asc" }, { shotName: "asc" }],
    }),
    db.soundTask.findMany({
      where: { projectId: id },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
    db.colorGradingSession.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PostProductionClient
      projectId={id}
      initialEditVersions={editVersions}
      initialVfxShots={vfxShots}
      initialSoundTasks={soundTasks}
      initialColorSessions={colorSessions}
    />
  );
}
