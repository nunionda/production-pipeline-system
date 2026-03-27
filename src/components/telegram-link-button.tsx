"use client";

import { useState } from "react";

interface Props {
  userId: string;
  isLinked: boolean;
}

export function TelegramLinkButton({ userId, isLinked }: Props) {
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLinked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
        텔레그램 연결됨
      </span>
    );
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/telegram-link`, {
        method: "POST",
      });
      if (res.ok) {
        const { deepLink: link } = await res.json();
        setDeepLink(link);
      } else {
        setError("링크 생성 실패");
      }
    } catch {
      setError("오류 발생");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!deepLink) return;
    await navigator.clipboard.writeText(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) {
    return <span className="text-xs text-red-600">{error}</span>;
  }

  if (deepLink) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-[200px] truncate rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
          {deepLink}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs text-blue-700 hover:underline"
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      📱 {loading ? "생성 중…" : "텔레그램 연결"}
    </button>
  );
}
