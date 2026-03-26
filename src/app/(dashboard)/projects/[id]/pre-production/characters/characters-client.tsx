"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Character = {
  id: string;
  name: string;
  description: string | null;
  _count: { scenes: number };
  scenes: Array<{ scene: { number: number } }>;
};

export function CharactersClient({
  projectId,
  initialCharacters,
}: {
  projectId: string;
  initialCharacters: Character[];
}) {
  const router = useRouter();
  const [characters, setCharacters] = useState(initialCharacters);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const apiBase = `/api/projects/${projectId}/characters`;

  async function addCharacter() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    });
    if (res.ok) {
      const c = await res.json();
      setCharacters((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewDesc("");
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      setEditingId(null);
      router.refresh();
    }
    setSaving(false);
  }

  async function deleteCharacter(id: string) {
    if (!confirm("이 등장인물을 삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {characters.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">등장인물이 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">시나리오 분석 후 자동 추출되거나 직접 추가할 수 있습니다</p>
        </div>
      )}

      {characters.map((c) => (
        <div key={c.id} className="border border-gray-200 rounded-lg p-4">
          {editingId === c.id ? (
            <div className="space-y-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="이름"
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="설명 (선택)"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(c.id)}
                  disabled={saving}
                  className="rounded bg-primary-800 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                {c.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {c._count.scenes}개 씬 출연
                  {c.scenes.length > 0 && (
                    <span className="ml-1">
                      (S#{c.scenes.map((s) => s.scene.number).join(", S#")}
                      {c._count.scenes > 5 ? " ..." : ""})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => {
                    setEditingId(c.id);
                    setEditName(c.name);
                    setEditDesc(c.description ?? "");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  수정
                </button>
                <button
                  onClick={() => deleteCharacter(c.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCharacter()}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="캐릭터 이름 *"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="설명 (선택)"
          />
          <div className="flex gap-2">
            <button
              onClick={addCharacter}
              disabled={saving || !newName.trim()}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              추가
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(""); setNewDesc(""); }}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + 등장인물 추가
        </button>
      )}
    </div>
  );
}
