import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { ScriptUploadForm } from "./upload-form";

export default async function ScriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const scripts = await db.script.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { scenes: true } },
      analysisJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">시나리오</h2>
          <p className="mt-1 text-sm text-gray-500">
            시나리오를 업로드하면 AI가 씬, 등장인물, 소품 등을 자동 분석합니다
          </p>
        </div>
      </div>

      {/* Upload form */}
      <ScriptUploadForm projectId={id} />

      {/* Script list */}
      {scripts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-700">
            업로드된 시나리오
          </h3>
          <div className="mt-3 space-y-3">
            {scripts.map((script) => {
              const lastJob = script.analysisJobs[0];
              const statusMap: Record<string, { variant: "complete" | "active" | "waiting" | "warning" | "blocked"; label: string }> = {
                PENDING: { variant: "waiting", label: "분석 대기" },
                PROCESSING: { variant: "active", label: "분석 중" },
                COMPLETED: { variant: "complete", label: "분석 완료" },
                FAILED: { variant: "blocked", label: "분석 실패" },
              };
              const status = statusMap[lastJob?.status ?? script.analysisStatus] ?? statusMap.PENDING;

              return (
                <div
                  key={script.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-surface p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {script.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      v{script.version} · {script._count.scenes}개 씬 ·{" "}
                      {new Intl.DateTimeFormat("ko-KR").format(script.createdAt)}
                    </p>
                  </div>
                  <StatusBadge {...status} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
