import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { LocationsClient } from "./locations-client";

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { title: true } });
  if (!project) notFound();

  const locations = await db.location.findMany({
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
          로케이션 <span className="text-sm font-normal text-gray-400">({locations.length})</span>
        </h2>
      </div>
      <LocationsClient projectId={id} initialLocations={locations} />
    </div>
  );
}
