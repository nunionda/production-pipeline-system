"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  scheduleId: string;
  dayId: string;
  hasCallSheet: boolean;
};

type State = "idle" | "loading" | "ready" | "error";

export function CallsheetShareButton({ projectId, scheduleId, dayId, hasCallSheet }: Props) {
  const [state, setState] = useState<State>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setState("loading");
    try {
      const res = await fetch(
        `/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet/share`,
        { method: "POST" }
      );
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json();
      setShareUrl(`${window.location.origin}/c/${data.token}`);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (!hasCallSheet) {
    return (
      <button
        disabled
        title="콜시트가 없습니다"
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
      >
        링크 공유
      </button>
    );
  }

  if (state === "ready" && shareUrl) {
    return (
      <div className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1">
        <span className="text-xs text-gray-500 max-w-[140px] truncate">/c/{shareUrl.split("/c/")[1]}</span>
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap"
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        재시도
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {state === "loading" ? "생성 중…" : "링크 공유"}
    </button>
  );
}
