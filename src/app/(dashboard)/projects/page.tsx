import Link from "next/link";
import { db } from "@/lib/db";
import { StatusBadge, phaseToStatus } from "@/components/status-badge";

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { members: true, scripts: true } },
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
          <p className="mt-1 text-sm text-gray-500">
            전체 프로젝트 목록
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          프로젝트 생성
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
          <span className="text-4xl">🎬</span>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            첫 프로젝트를 만들어보세요
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            시나리오를 업로드하면 AI가 자동으로 분석합니다
          </p>
          <Link
            href="/projects/new"
            className="mt-6 rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            프로젝트 생성
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-surface">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제목
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포맷
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  단계
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  팀원
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  최근 수정
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => {
                const status = phaseToStatus(project.phase);
                return (
                  <tr
                    key={project.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary-800"
                      >
                        {project.title}
                      </Link>
                      {project.platform && (
                        <p className="text-xs text-gray-500">
                          {project.platform}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatLabel(project.format)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge {...status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {project._count.members}명
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(project.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatLabel(format: string): string {
  const labels: Record<string, string> = {
    DRAMA: "드라마",
    FILM: "영화",
    VARIETY: "예능",
    DOCUMENTARY: "다큐",
    SHORT: "단편",
    WEB_DRAMA: "웹드라마",
    OTHER: "기타",
  };
  return labels[format] || format;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
