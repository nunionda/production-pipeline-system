import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { DeliveryClient } from "./delivery-client";

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { title: true } });
  if (!project) notFound();

  const [qcReports, masterFiles, deliveryTargets] = await Promise.all([
    db.qCReport.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }).then((rows) =>
      rows.map((r) => ({ ...r, issues: r.issues as { description: string; severity: "LOW" | "HIGH"; resolved: boolean }[] | null }))
    ),
    db.masterFile.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
    db.deliveryTarget.findMany({
      where: { projectId: id },
      orderBy: [{ status: "asc" }, { recipientName: "asc" }],
    }),
  ]);

  return (
    <DeliveryClient
      projectId={id}
      initialQcReports={qcReports}
      initialMasterFiles={masterFiles}
      initialDeliveryTargets={deliveryTargets}
    />
  );
}
