"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CostumeStatus = "PREPARING" | "READY" | "REPAIRING";

type Costume = {
  id: string;
  name: string;
  character: string | null;
  status: CostumeStatus;
  _count: { scenes: number };
  scenes: Array<{ scene: { number: number } }>;
};

const STATUS_LABELS: Record<CostumeStatus, string> = {
  PREPARING: "준비중",
  READY: "완료",
  REPAIRING: "수선중",
};

const STATUS_COLORS: Record<CostumeStatus, string> = {
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-green-100 text-green-700",
  REPAIRING: "bg-red-100 text-red-600",
};

export function CostumesClient({
  projectId,
  initialCostumes,
}: {
  projectId: string;
  initialCostumes: Costume[];
}) {
  const router = useRouter();
  const [costumes, setCostumes] = useState(initialCostumes);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", character: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", character: "" });

  const apiBase = `/api/projects/${projectId}/costumes`;

  async function addCostume() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), character: form.character.trim() || null }),
    });
    if (res.ok) {
      const c = await res.json();
      setCostumes((prev) => [...prev, c].sort((a, b) => (a.character ?? "").localeCompare(b.character ?? "")));
      setForm({ name: "", character: "" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: CostumeStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setCostumes((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    }
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return;
    setSaving(true);
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name.trim(), character: editForm.character.trim() || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCostumes((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      setEditingId(null);
    }
    setSaving(false);
  }

  async function deleteCostume(id: string) {
    if (!confirm("이 의상을 삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setCostumes((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  // Group by character
  const characters = [...new Set(costumes.map((c) => c.character ?? "(미지정)"))].sort();

  return (
    <div className="space-y-6">
      {costumes.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-amber-700 font-medium">{costumes.filter((c) => c.status === "PREPARING").length} 준비중</span>
          <span className="text-green-700 font-medium">{costumes.filter((c) => c.status === "READY").length} 완료</span>
          {costumes.filter((c) => c.status === "REPAIRING").length > 0 && (
            <span className="text-red-600 font-medium">{costumes.filter((c) => c.status === "REPAIRING").length} 수선중</span>
          )}
        </div>
      )}

      {costumes.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">의상이 없습니다</p>
        </div>
      )}

      {characters.map((char) => (
        <div key={char}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{char}</h3>
          <div className="space-y-2">
            {costumes.filter((c) => (c.character ?? "(미지정)") === char).map((c) => (
              <div key={c.id} className="border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                {editingId === c.id ? (
                  <div className="flex gap-2 flex-1 flex-wrap">
                    <input autoFocus value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                      placeholder="의상명 *" />
                    <input value={editForm.character} onChange={(e) => setEditForm((f) => ({ ...f, character: e.target.value }))}
                      className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                      placeholder="캐릭터" />
                    <button onClick={() => saveEdit(c.id)} disabled={saving}
                      className="rounded bg-primary-800 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">저장</button>
                    <button onClick={() => setEditingId(null)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">취소</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c._count.scenes}개 씬
                        {c.scenes.length > 0 && ` (S#${c.scenes.map((s) => s.scene.number).join(", S#")}${c._count.scenes > 5 ? " ..." : ""})`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex gap-1">
                        {(["PREPARING", "READY", "REPAIRING"] as CostumeStatus[]).map((s) => (
                          <button key={s} onClick={() => updateStatus(c.id, s)}
                            className={`rounded px-2 py-0.5 text-xs transition-colors ${
                              c.status === s ? STATUS_COLORS[s] + " font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}>
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, character: c.character ?? "" }); }}
                        className="text-xs text-gray-400 hover:text-gray-600">수정</button>
                      <button onClick={() => deleteCostume(c.id)}
                        className="text-xs text-red-400 hover:text-red-600">삭제</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addCostume()}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="의상명 *" />
          <input value={form.character} onChange={(e) => setForm((f) => ({ ...f, character: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="착용 캐릭터" />
          <div className="flex gap-2">
            <button onClick={addCostume} disabled={saving || !form.name.trim()}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => { setAdding(false); setForm({ name: "", character: "" }); }}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 의상 추가
        </button>
      )}
    </div>
  );
}
