"use client";

import { useState } from "react";

type Confirmation = { actorName: string; actorRole: string | null; confirmedAt: Date };
type Share = {
  id: string;
  token: string;
  viewCount: number;
  confirmations: Confirmation[];
  callSheet: { cast: unknown };
  shootingDayId: string;
};

type CastEntry = { name: string; role?: string };

export function AdConfirmSection({
  share,
  projectId: _projectId,
  dayId: _dayId,
}: {
  share: Share;
  projectId: string;
  dayId: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${share.token}`;

  const cast = Array.isArray(share.callSheet.cast)
    ? (share.callSheet.cast as CastEntry[])
    : [];

  const confirmedNames = new Set(share.confirmations.map((c) => c.actorName));
  const unconfirmed = cast.filter((c) => !confirmedNames.has(c.name));

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        콜시트 확인 현황
      </h3>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Share link bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs text-gray-500 flex-1 truncate">/c/{share.token.slice(0, 8)}…</span>
          <span className="text-xs text-gray-400">조회 {share.viewCount}회</span>
          <button
            onClick={copyLink}
            className="text-xs text-blue-700 hover:text-blue-900 font-medium"
          >
            {copied ? "복사됨!" : "링크 복사"}
          </button>
        </div>

        {/* Confirmed list */}
        {share.confirmations.length > 0 && (
          <div className="divide-y divide-gray-100">
            {share.confirmations.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-green-600 text-xs">✓</span>
                <span className="text-sm font-medium text-gray-900">{c.actorName}</span>
                {c.actorRole && (
                  <span className="text-xs text-gray-500">({c.actorRole})</span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(c.confirmedAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Unconfirmed list */}
        {unconfirmed.length > 0 && (
          <div className="divide-y divide-gray-100">
            {unconfirmed.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-amber-50">
                <span className="text-amber-500 text-xs">○</span>
                <span className="text-sm text-gray-600">{c.name}</span>
                {c.role && <span className="text-xs text-gray-400">({c.role})</span>}
                <span className="ml-auto text-xs text-amber-600">미확인</span>
              </div>
            ))}
          </div>
        )}

        {cast.length === 0 && share.confirmations.length === 0 && (
          <div className="px-4 py-4 text-center text-sm text-gray-400">
            확인 없음
          </div>
        )}

        {/* Summary */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center">
          <span className="text-xs text-gray-500">
            {share.confirmations.length}/{cast.length > 0 ? cast.length : "?"} 확인 완료
          </span>
        </div>
      </div>
    </section>
  );
}
