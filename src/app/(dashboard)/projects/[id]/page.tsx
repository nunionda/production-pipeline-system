import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PhaseTabs } from "@/components/phase-tabs";
import { StatusBadge, phaseToStatus } from "@/components/status-badge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          members: true,
          scripts: true,
          characters: true,
          props: true,
          locations: true,
          schedules: true,
        },
      },
    },
  });

  if (!project) notFound();

  const status = phaseToStatus(project.phase);

  return (
    <div>
      {/* Header */}
      <div className="border-b border-gray-200 bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
          <StatusBadge {...status} />
        </div>
        {project.platform && (
          <p className="mt-1 text-sm text-gray-500">{project.platform}</p>
        )}
      </div>

      {/* Phase tabs */}
      <PhaseTabs projectId={project.id} />

      {/* Overview content */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">프로젝트 개요</h2>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="시나리오" value={project._count.scripts} href={`/projects/${project.id}/script`} />
          <StatCard label="등장인물" value={project._count.characters} href={`/projects/${project.id}/pre-production/characters`} />
          <StatCard label="소품" value={project._count.props} href={`/projects/${project.id}/pre-production/props`} />
          <StatCard label="로케이션" value={project._count.locations} href={`/projects/${project.id}/pre-production/locations`} />
          <StatCard label="팀원" value={project._count.members} />
        </div>

        {project.description && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700">설명</h3>
            <p className="mt-1 text-sm text-gray-600">{project.description}</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`/projects/${project.id}/script`}
            className="rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            시나리오 업로드
          </a>
          <a
            href={`/projects/${project.id}/pre-production`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            프리프로덕션
          </a>
          <a
            href={`/projects/${project.id}/schedule`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            스케줄 관리
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-lg border border-gray-200 bg-surface p-4 block hover:border-primary-300 hover:bg-primary-50 transition-colors">
        {content}
      </Link>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-surface p-4">
      {content}
    </div>
  );
}
