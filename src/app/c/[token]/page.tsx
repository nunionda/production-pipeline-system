"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { findActorInCast, type CastEntry } from "@/lib/callsheet";

type CallSheetShare = {
  id: string;
  token: string;
  expiresAt: string;
  shootingDay: {
    date: string;
    location: string | null;
    callTime: string | null;
    notes: string | null;
    schedule: {
      project: { title: string };
    };
  };
  callSheet: {
    callTime: string;
    scenes: unknown;
    cast: unknown;
    crew: unknown;
    equipment: unknown;
    meals: unknown;
    notes: string | null;
  };
};

export default function PublicCallSheetPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const actorParam = searchParams.get("actor") ?? "";

  const [data, setData] = useState<CallSheetShare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actorName, setActorName] = useState(actorParam);

  useEffect(() => {
    fetch(`/api/c/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("콜시트를 불러올 수 없습니다"));
  }, [token]);

  async function handleConfirm() {
    if (!actorName.trim()) return;
    setConfirming(true);
    const res = await fetch(`/api/c/${token}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorName }),
    });
    setConfirming(false);
    if (res.ok) {
      setConfirmed(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "확인에 실패했습니다");
    }
  }

  // 에러 상태: 카드 형태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <p className="text-3xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-900">링크를 찾을 수 없습니다</h2>
          <p className="text-sm text-gray-500 mt-2">제작사에 문의해 주세요.</p>
        </div>
      </div>
    );
  }

  // 로딩 상태: 스켈레톤
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="bg-blue-800 h-28" />
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="bg-white rounded-lg h-24" />
          <div className="bg-white rounded-lg h-40" />
          <div className="bg-white rounded-lg h-32" />
        </div>
      </div>
    );
  }

  const cast = Array.isArray(data.callSheet.cast) ? (data.callSheet.cast as CastEntry[]) : [];
  const myEntry = findActorInCast(cast, actorParam);
  const projectTitle = data.shootingDay.schedule.project.title;

  const shootDate = new Date(data.shootingDay.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-800 text-white px-4 py-5">
        <p className="text-xs opacity-70 uppercase tracking-wide">{projectTitle} 콜시트</p>
        <h1 className="text-xl font-bold mt-1">{shootDate}</h1>
        {data.shootingDay.location && (
          <p className="text-sm opacity-90 mt-0.5">{data.shootingDay.location}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs bg-blue-700 rounded px-2 py-0.5">호출</span>
          <span className="font-semibold">{data.callSheet.callTime}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* 내 콜타임 하이라이트 — 확인 완료 후에도 Yellow 카드 유지 + green badge */}
        {myEntry && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-yellow-700 font-medium uppercase">내 콜타임</p>
              {confirmed && (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  ✓ 확인 완료
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-yellow-800 mt-1">
              {myEntry.callTime ?? data.callSheet.callTime}
            </p>
            <p className="text-sm text-yellow-700 mt-0.5">
              {myEntry.name}
              {myEntry.role ? ` (${myEntry.role})` : ""}
            </p>
          </div>
        )}

        {/* Cast list */}
        {cast.length > 0 && (
          <section className="bg-white rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 px-4 pt-4 pb-2 border-b">출연진 호출</h2>
            <ul className="divide-y">
              {cast.map((c, i) => (
                <li
                  key={i}
                  className={`px-4 py-3 flex justify-between items-center ${
                    c.name === actorParam || c.role === actorParam ? "bg-yellow-50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
                  </div>
                  <p className="text-sm font-semibold text-blue-800">
                    {c.callTime ?? data.callSheet.callTime}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Notes */}
        {data.callSheet.notes && (
          <section className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">특이사항</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.callSheet.notes}</p>
          </section>
        )}

        {/* 확인 섹션 */}
        <section className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">콜시트 확인</h2>
          {confirmed ? (
            <div className="text-center py-2">
              <p className="text-green-600 font-semibold text-lg">
                ✔ {actorName} 님 확인 완료
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="이름 입력 (예: 김민준)"
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleConfirm}
                disabled={!actorName.trim() || confirming}
                className="w-full bg-blue-800 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform"
              >
                {confirming ? "확인 중…" : "콜시트 확인했습니다"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
