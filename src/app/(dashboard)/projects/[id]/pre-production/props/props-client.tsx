"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PropStatus = "UNACQUIRED" | "ACQUIRED" | "NOT_NEEDED";

type Prop = {
  id: string;
  name: string;
  status: PropStatus;
  _count: { scenes: number };
  scenes: Array<{ scene: { number: number } }>;
};

const STATUS_LABELS: Record<PropStatus, string> = {
  UNACQUIRED: "미확보",
  ACQUIRED: "확보",
  NOT_NEEDED: "불요",
};

const STATUS_COLORS: Record<PropStatus, string> = {
  UNACQUIRED: "bg-amber-100 text-amber-700",
  ACQUIRED: "bg-green-100 text-green-700",
  NOT_NEEDED: "bg-gray-100 text-gray-500",
};

export function PropsClient({
  projectId,
  initialProps,
}: {
  projectId: string;
  initialProps: Prop[];
}) {
  const router = useRouter();
  const [props, setProps] = useState(initialProps);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const apiBase = `/api/projects/${projectId}/props`;

  async function addProp() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const p = await res.json();
      setProps((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: PropStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setProps((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      setProps((prev) => prev.map((p) => (p.id === id ? { ...p, name: editName.trim() } : p)));
      setEditingId(null);
    }
    setSaving(false);
  }

  async function deleteProp(id: string) {
    if (!confirm("이 소품을 삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setProps((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  // Group by status for display
  const unacquired = props.filter((p) => p.status === "UNACQUIRED");
  const acquired = props.filter((p) => p.status === "ACQUIRED");
  const notNeeded = props.filter((p) => p.status === "NOT_NEEDED");
  const groups = [
    { label: "미확보", items: unacquired },
    { label: "확보", items: acquired },
    { label: "불요", items: notNeeded },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {props.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-amber-700 font-medium">{unacquired.length} 미확보</span>
          <span className="text-green-700 font-medium">{acquired.length} 확보</span>
          {notNeeded.length > 0 && <span className="text-gray-500">{notNeeded.length} 불요</span>}
        </div>
      )}

      {props.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">소품이 없습니다</p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.label}</h3>
          <div className="space-y-2">
            {group.items.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                {editingId === p.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(p.id)}
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                    />
                    <button onClick={() => saveEdit(p.id)} disabled={saving}
                      className="rounded bg-primary-800 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">저장</button>
                    <button onClick={() => setEditingId(null)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">취소</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {p._count.scenes}개 씬
                        {p.scenes.length > 0 && ` (S#${p.scenes.map((s) => s.scene.number).join(", S#")}${p._count.scenes > 5 ? " ..." : ""})`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex gap-1">
                        {(["UNACQUIRED", "ACQUIRED", "NOT_NEEDED"] as PropStatus[]).map((s) => (
                          <button key={s} onClick={() => updateStatus(p.id, s)}
                            className={`rounded px-2 py-0.5 text-xs transition-colors ${
                              p.status === s ? STATUS_COLORS[s] + " font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}>
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                        className="text-xs text-gray-400 hover:text-gray-600">수정</button>
                      <button onClick={() => deleteProp(p.id)}
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
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProp()}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="소품명 *" />
          <div className="flex gap-2">
            <button onClick={addProp} disabled={saving || !newName.trim()}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => { setAdding(false); setNewName(""); }}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 소품 추가
        </button>
      )}
    </div>
  );
}
