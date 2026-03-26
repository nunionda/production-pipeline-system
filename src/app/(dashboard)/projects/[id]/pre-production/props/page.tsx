import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PropsClient } from "./props-client";

export default async function PropsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { title: true } });
  if (!project) notFound();

  const props = await db.prop.findMany({
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
          소품 <span className="text-sm font-normal text-gray-400">({props.length})</span>
        </h2>
      </div>
      <PropsClient projectId={id} initialProps={props} />
    </div>
  );
}
