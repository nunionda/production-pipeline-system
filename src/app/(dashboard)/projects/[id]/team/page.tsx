import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { groupByRole } from "@/lib/team";
import { TeamDirectoryClient } from "./team-directory-client";

type Props = { params: Promise<{ id: string }> };

export default async function TeamDirectoryPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const [project, members] = await Promise.all([
    db.project.findUnique({ where: { id }, select: { title: true } }),
    db.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!project) notFound();

  const groups = groupByRole(members);
  const currentUserId = session?.user?.id ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{project.title}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">팀 디렉토리</h1>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/projects/${id}/team/export?format=pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            PDF
          </a>
          <a
            href={`/api/projects/${id}/team/export?format=excel`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Excel
          </a>
        </div>
      </div>

      <TeamDirectoryClient
        groups={groups}
        currentUserId={currentUserId}
        projectId={id}
      />
    </div>
  );
}
