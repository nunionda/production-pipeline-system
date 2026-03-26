"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LocationStatus = "UNCONFIRMED" | "SCOUTING" | "CONFIRMED" | "UNAVAILABLE";

type Location = {
  id: string;
  name: string;
  realName: string | null;
  address: string | null;
  status: LocationStatus;
  _count: { scenes: number };
  scenes: Array<{ scene: { number: number } }>;
};

const STATUS_LABELS: Record<LocationStatus, string> = {
  UNCONFIRMED: "미확인",
  SCOUTING: "헌팅중",
  CONFIRMED: "확정",
  UNAVAILABLE: "불가",
};

const STATUS_COLORS: Record<LocationStatus, string> = {
  UNCONFIRMED: "bg-gray-100 text-gray-600",
  SCOUTING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  UNAVAILABLE: "bg-red-100 text-red-600",
};

export function LocationsClient({
  projectId,
  initialLocations,
}: {
  projectId: string;
  initialLocations: Location[];
}) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialLocations);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", realName: "", address: "", status: "UNCONFIRMED" as LocationStatus });
  const [editForm, setEditForm] = useState({ name: "", realName: "", address: "", status: "UNCONFIRMED" as LocationStatus });

  const apiBase = `/api/projects/${projectId}/locations`;

  async function addLocation() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const l = await res.json();
      setLocations((prev) => [...prev, l].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", realName: "", address: "", status: "UNCONFIRMED" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: LocationStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    }
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      setEditingId(null);
      router.refresh();
    }
    setSaving(false);
  }

  async function deleteLocation(id: string) {
    if (!confirm("이 로케이션을 삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setLocations((prev) => prev.filter((l) => l.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {locations.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">로케이션이 없습니다</p>
        </div>
      )}

      {locations.map((l) => (
        <div key={l.id} className="border border-gray-200 rounded-lg p-4">
          {editingId === l.id ? (
            <div className="space-y-2">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="대본 장소명 *"
              />
              <input
                value={editForm.realName}
                onChange={(e) => setEditForm((f) => ({ ...f, realName: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="실제 장소명"
              />
              <input
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="주소"
              />
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as LocationStatus }))}
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              >
                {Object.entries(STATUS_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={() => saveEdit(l.id)} disabled={saving}
                  className="rounded bg-primary-800 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  저장
                </button>
                <button onClick={() => setEditingId(null)}
                  className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{l.name}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status]}`}>
                    {STATUS_LABELS[l.status]}
                  </span>
                </div>
                {l.realName && <p className="text-xs text-gray-600">실제: {l.realName}</p>}
                {l.address && <p className="text-xs text-gray-500">{l.address}</p>}
                <p className="text-xs text-gray-400">
                  {l._count.scenes}개 씬
                  {l.scenes.length > 0 && ` (S#${l.scenes.map((s) => s.scene.number).join(", S#")}${l._count.scenes > 5 ? " ..." : ""})`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingId(l.id); setEditForm({ name: l.name, realName: l.realName ?? "", address: l.address ?? "", status: l.status }); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >수정</button>
                  <button onClick={() => deleteLocation(l.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                </div>
                <div className="flex gap-1">
                  {(["UNCONFIRMED", "SCOUTING", "CONFIRMED", "UNAVAILABLE"] as LocationStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(l.id, s)}
                      className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                        l.status === s
                          ? STATUS_COLORS[s] + " font-medium"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="대본 장소명 *" />
          <input value={form.realName} onChange={(e) => setForm((f) => ({ ...f, realName: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="실제 장소명" />
          <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="주소" />
          <div className="flex gap-2">
            <button onClick={addLocation} disabled={saving || !form.name.trim()}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => { setAdding(false); setForm({ name: "", realName: "", address: "", status: "UNCONFIRMED" }); }}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 로케이션 추가
        </button>
      )}
    </div>
  );
}
