import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { CharactersClient } from "./characters-client";

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { title: true } });
  if (!project) notFound();

  const characters = await db.character.findMany({
    where: { projectId: id },
    include: {
      _count: { select: { scenes: true } },
      scenes: {
        include: { scene: { select: { number: true } } },
        orderBy: { scene: { number: "asc" } },
        take: 5,
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          등장인물 <span className="text-sm font-normal text-gray-400">({characters.length})</span>
        </h2>
      </div>
      <CharactersClient projectId={id} initialCharacters={characters} />
    </div>
  );
}
