"use client";

import { useState } from "react";

interface Props {
  projectId: string;
  scheduleId: string;
  dayId: string;
  hasTelegramGroup: boolean;
}

export function TelegramSendButton({
  projectId,
  scheduleId,
  dayId,
  hasTelegramGroup,
}: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  if (!hasTelegramGroup) {
    return (
      <button
        disabled
        title="프로젝트 설정에서 텔레그램 그룹을 연결해 주세요"
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
      >
        텔레그램 발송
      </button>
    );
  }

  async function handleSend() {
    setStatus("sending");
    try {
      const res = await fetch(`/api/projects/${projectId}/telegram/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId, scheduleId }),
      });
      if (res.ok) {
        setStatus("sent");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "발송 실패");
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const labels: Record<typeof status, string> = {
    idle: "텔레그램 발송 ▶",
    sending: "발송 중…",
    sent: "발송 완료! ✓",
    error: "발송 실패",
  };

  return (
    <button
      onClick={handleSend}
      disabled={status === "sending"}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        status === "sent"
          ? "border-green-300 bg-green-50 text-green-700"
          : status === "error"
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
      }`}
    >
      {labels[status]}
    </button>
  );
}
