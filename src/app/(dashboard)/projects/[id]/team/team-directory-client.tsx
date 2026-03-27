"use client";

import { useState } from "react";
import type { RoleGroup } from "@/lib/team";
import { TelegramLinkButton } from "@/components/telegram-link-button";

type Props = {
  groups: RoleGroup[];
  currentUserId: string | null;
  projectId: string;
};

export function TeamDirectoryClient({ groups, currentUserId }: Props) {
  const [phones, setPhones] = useState<Record<string, string | null>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getPhone(userId: string, original: string | null): string | null {
    return userId in phones ? phones[userId] : original;
  }

  function startEdit(userId: string, current: string | null) {
    setEditing(userId);
    setEditValue(current ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue("");
    setError(null);
  }

  async function savePhone(userId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editValue }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "저장 실패");
        return;
      }
      setPhones((prev) => ({ ...prev, [userId]: editValue.trim() || null }));
      setEditing(null);
    } catch {
      setError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  if (groups.length === 0) {
    return (
      <p className="text-center text-gray-400 py-16">
        팀원이 없습니다. 설정 &gt; 팀 관리에서 초대하세요.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.role}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-2">
            {group.label}
          </h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {group.members.map((m) => {
              const phone = getPhone(m.user.id, m.user.phone);
              const isEditing = editing === m.user.id;
              const canEdit = m.user.id === currentUserId;

              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                    <p className="text-xs text-gray-500">{m.user.email}</p>
                  </div>

                  <TelegramLinkButton
                    userId={m.user.id}
                    isLinked={!!m.user.telegramChatId}
                  />

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="010-0000-0000"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") savePhone(m.user.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <button
                        onClick={() => savePhone(m.user.id)}
                        disabled={saving}
                        className="text-xs text-blue-700 font-medium hover:text-blue-900 disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${phone ? "text-gray-800" : "text-gray-400"}`}>
                        {phone ?? "(미등록)"}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => startEdit(m.user.id, phone)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          aria-label="전화번호 편집"
                        >
                          ✎
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
