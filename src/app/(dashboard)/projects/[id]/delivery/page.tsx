export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900">납품</h2>
      <p className="mt-2 text-sm text-gray-500">
        Sprint 6에서 구현 예정 — QC/마스터링/배급사 전달
      </p>
    </div>
  );
}
