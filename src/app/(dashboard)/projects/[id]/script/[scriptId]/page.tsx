import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { AnalysisReviewClient } from "./review-client";

interface Props {
  params: Promise<{ id: string; scriptId: string }>;
}

export default async function ScriptReviewPage({ params }: Props) {
  const { id, scriptId } = await params;

  const script = await db.script.findFirst({
    where: { id: scriptId, projectId: id },
    include: {
      scenes: {
        orderBy: { number: "asc" },
        include: {
          characters: { include: { character: true } },
          props: { include: { prop: true } },
          costumes: { include: { costume: true } },
          locations: { include: { location: true } },
          vfxItems: { include: { vfx: true } },
        },
      },
      analysisJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!script) notFound();

  const statusMap: Record<string, { variant: "complete" | "active" | "waiting" | "blocked"; label: string }> = {
    PENDING: { variant: "waiting", label: "분석 대기" },
    PROCESSING: { variant: "active", label: "분석 중" },
    COMPLETED: { variant: "complete", label: "분석 완료" },
    FAILED: { variant: "blocked", label: "분석 실패" },
  };

  const status = statusMap[script.analysisStatus] ?? statusMap.PENDING;
  const lastJob = script.analysisJobs[0];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {script.title}
          </h2>
          <StatusBadge {...status} />
          <span className="text-xs text-gray-400">v{script.version}</span>
        </div>
        <a
          href={`/projects/${id}/script`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          목록으로
        </a>
      </div>

      {/* Error display */}
      {lastJob?.error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          분석 오류: {lastJob.error}
        </div>
      )}

      {/* Analysis Review — "Magic Trick" parallel view */}
      <AnalysisReviewClient
        projectId={id}
        scriptId={scriptId}
        parsedText={script.parsedText || ""}
        scenes={script.scenes.map((s) => ({
          id: s.id,
          number: s.number,
          intExt: s.intExt,
          location: s.location,
          timeOfDay: s.timeOfDay,
          description: s.description || "",
          characters: s.characters.map((sc) => ({
            name: sc.character.name,
            description: sc.character.description || undefined,
            action: sc.action || undefined,
          })),
          props: s.props.map((sp) => ({
            name: sp.prop.name,
            usage: sp.usage || undefined,
          })),
          costumes: s.costumes.map((sc) => ({
            character: sc.costume.character || "",
            description: sc.costume.name,
          })),
          locations: s.locations.map((sl) => ({
            name: sl.location.name,
          })),
        }))}
        analysisStatus={script.analysisStatus}
      />
    </div>
  );
}
