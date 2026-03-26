import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
      <p className="mt-2 text-sm text-gray-500">
        프로덕션 파이프라인 전체 현황
      </p>

      {/* Empty state */}
      <div className="mt-12 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
        <span className="text-4xl">🎬</span>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          아직 프로젝트가 없습니다
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          첫 프로젝트를 만들어 프로덕션 관리를 시작하세요
        </p>
        <Link
          href="/projects/new"
          className="mt-6 rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          프로젝트 생성
        </Link>
      </div>
    </div>
  );
}
