export default async function PostProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900">포스트프로덕션</h2>
      <p className="mt-2 text-sm text-gray-500">
        Sprint 5에서 구현 예정 — 편집/VFX/사운드/색보정 추적
      </p>
    </div>
  );
}
