export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900">촬영 스케줄</h2>
      <p className="mt-2 text-sm text-gray-500">
        Sprint 2에서 구현 예정 — 촬영일 생성 + 콜시트
      </p>
    </div>
  );
}
