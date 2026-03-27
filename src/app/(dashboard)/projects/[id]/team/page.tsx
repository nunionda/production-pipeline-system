import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TelegramLinkButton } from "@/components/telegram-link-button";

const ROLE_LABELS: Record<string, string> = {
  PD: "PD/연출",
  AD: "조감독",
  WRITER: "작가",
  ART_DIRECTOR: "미술감독",
  DOP: "촬영감독",
  LIGHTING: "조명감독",
  SOUND: "사운드",
  EDITOR: "편집",
  VFX_SUPERVISOR: "VFX 슈퍼바이저",
  PRODUCER: "프로듀서",
  PRODUCTION_MANAGER: "제작부장",
  STAFF: "일반 스태프",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!project) notFound();

  const members = await db.projectMember.findMany({
    where: { projectId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          telegramChatId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">팀 디렉토리</h1>
        <p className="text-sm text-gray-500 mt-0.5">{project.title}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">이름</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">역할</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">이메일</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">텔레그램</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{m.user.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {ROLE_LABELS[m.role] ?? m.role}
                </td>
                <td className="px-4 py-3 text-gray-500">{m.user.email}</td>
                <td className="px-4 py-3">
                  <TelegramLinkButton
                    userId={m.user.id}
                    isLinked={!!m.user.telegramChatId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            등록된 팀원이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
