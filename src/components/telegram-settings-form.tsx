"use client";

import { useState } from "react";

interface Props {
  projectId: string;
  initialChatId?: string | null;
}

export function TelegramSettingsForm({ projectId, initialChatId }: Props) {
  const [chatId, setChatId] = useState(initialChatId ?? "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramChatId: chatId || null }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "저장되었습니다." });
      } else {
        setMessage({ type: "error", text: "저장 실패" });
      }
    } catch {
      setMessage({ type: "error", text: "저장 중 오류 발생" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!chatId) return;
    setTesting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/telegram/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });
      if (res.ok) {
        setMessage({
          type: "success",
          text: "테스트 메시지를 발송했습니다. 텔레그램을 확인해 주세요.",
        });
      } else {
        setMessage({ type: "error", text: "테스트 발송 실패" });
      }
    } catch {
      setMessage({ type: "error", text: "오류 발생" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          텔레그램 그룹 Chat ID
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="-1001234567890"
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !chatId}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? "발송 중…" : "테스트 메시지"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          텔레그램 그룹에 @raw_data_bot 초대 후 메시지 발송 → chat_id 복사
        </p>
      </div>
      {message && (
        <p
          className={`text-xs ${message.type === "success" ? "text-green-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
