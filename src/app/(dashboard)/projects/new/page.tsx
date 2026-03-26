import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ProjectFormat, ProjectPhase } from "@/generated/prisma/client";

const formatOptions: { value: ProjectFormat; label: string }[] = [
  { value: "DRAMA", label: "드라마" },
  { value: "FILM", label: "영화" },
  { value: "VARIETY", label: "예능" },
  { value: "DOCUMENTARY", label: "다큐멘터리" },
  { value: "SHORT", label: "단편" },
  { value: "WEB_DRAMA", label: "웹드라마" },
  { value: "OTHER", label: "기타" },
];

async function createProject(formData: FormData) {
  "use server";

  const title = formData.get("title") as string;
  const format = formData.get("format") as ProjectFormat;
  const platform = formData.get("platform") as string;
  const description = formData.get("description") as string;

  if (!title?.trim()) return;

  const project = await db.project.create({
    data: {
      title: title.trim(),
      format,
      platform: platform?.trim() || null,
      description: description?.trim() || null,
      phase: ProjectPhase.DEVELOPMENT,
    },
  });

  redirect(`/projects/${project.id}`);
}

export default function NewProjectPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">프로젝트 생성</h1>
      <p className="mt-1 text-sm text-gray-500">
        새 프로젝트의 기본 정보를 입력하세요
      </p>

      <form action={createProject} className="mt-8 max-w-xl space-y-6">
        {/* 제목 */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            프로젝트 제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            placeholder="예: 비밀의 숲 시즌3"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* 포맷 */}
        <div>
          <label
            htmlFor="format"
            className="block text-sm font-medium text-gray-700"
          >
            포맷
          </label>
          <select
            id="format"
            name="format"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {formatOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 플랫폼 */}
        <div>
          <label
            htmlFor="platform"
            className="block text-sm font-medium text-gray-700"
          >
            플랫폼
          </label>
          <input
            type="text"
            id="platform"
            name="platform"
            placeholder="예: tvN, 넷플릭스, 쿠팡플레이"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* 설명 */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            설명
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="프로젝트에 대한 간단한 설명"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            생성
          </button>
          <a
            href="/projects"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </a>
        </div>
      </form>
    </div>
  );
}
