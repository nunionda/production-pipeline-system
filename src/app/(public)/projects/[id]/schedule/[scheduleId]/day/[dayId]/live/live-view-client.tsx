"use client";

import { useEffect, useRef, useState } from "react";

type SceneStatus = {
  id: string;
  status: string;
  scene: {
    number: number;
    location: string | null;
    intExt: string | null;
    timeOfDay: string | null;
  };
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  WAITING:   { label: "대기",    bg: "bg-gray-100",  text: "text-gray-700",  ring: "ring-gray-300" },
  SHOOTING:  { label: "콜중",    bg: "bg-blue-100",  text: "text-blue-800",  ring: "ring-blue-400" },
  COMPLETED: { label: "완료",    bg: "bg-green-100", text: "text-green-800", ring: "ring-green-400" },
  RESHOOT:   { label: "재촬영",  bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-400" },
};

const ALL_STATUSES = ["WAITING", "SHOOTING", "COMPLETED", "RESHOOT"] as const;

const INTEXTKR: Record<string, string> = { INT: "실내", EXT: "실외" };
const TIMEDAYKR: Record<string, string> = { DAY: "낮", NIGHT: "밤", DAWN: "새벽", DUSK: "황혼" };

type Props = {
  projectTitle: string;
  shootDate: string;
  dayId: string;
  projectId: string;
  scheduleId: string;
  initialSceneStatuses: SceneStatus[];
};

export function LiveViewClient({
  projectTitle,
  shootDate,
  dayId,
  projectId,
  scheduleId,
  initialSceneStatuses,
}: Props) {
  const [statuses, setStatuses] = useState<SceneStatus[]>(initialSceneStatuses);
  const [connected, setConnected] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    function connect() {
      const es = new EventSource(
        `/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/events`
      );
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryCount.current = 0;
      };

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "scene-status-changed") {
          setStatuses((prev) =>
            prev.map((ss) =>
              ss.id === data.sceneStatusId ? { ...ss, status: data.status } : ss
            )
          );
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Reconnect with 3-second backoff, max 3 retries then keep trying every 30s
        const delay = retryCount.current < 3 ? 3000 : 30000;
        retryCount.current++;
        setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      esRef.current?.close();
    };
  }, [dayId, projectId, scheduleId]);

  async function updateStatus(ssId: string, newStatus: string) {
    setUpdating(ssId);
    // Optimistic update
    setStatuses((prev) =>
      prev.map((ss) => (ss.id === ssId ? { ...ss, status: newStatus } : ss))
    );
    await fetch(`/api/scene-statuses/${ssId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(null);
  }

  const completedCount = statuses.filter((s) => s.status === "COMPLETED").length;
  const totalCount = statuses.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">{projectTitle}</p>
          <h1 className="text-lg font-bold mt-0.5">{shootDate}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-xs text-gray-400">{connected ? "실시간" : "연결 중…"}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>씬 진행</span>
          <span>{completedCount}/{totalCount}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Scene list */}
      <div className="px-4 py-4 space-y-3">
        {statuses.length === 0 ? (
          <p className="text-center text-gray-500 py-12">배정된 씬이 없습니다</p>
        ) : (
          statuses.map((ss) => {
            const cfg = STATUS_CONFIG[ss.status] ?? STATUS_CONFIG.WAITING;
            const isUpdating = updating === ss.id;

            return (
              <div
                key={ss.id}
                className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden"
              >
                {/* Scene info */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xl font-bold text-blue-400 w-14 flex-shrink-0">
                    S#{ss.scene.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {ss.scene.location || "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ss.scene.intExt ? INTEXTKR[ss.scene.intExt] ?? ss.scene.intExt : ""}
                      {ss.scene.intExt && ss.scene.timeOfDay ? " · " : ""}
                      {ss.scene.timeOfDay ? TIMEDAYKR[ss.scene.timeOfDay] ?? ss.scene.timeOfDay : ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Status buttons — 48px touch targets */}
                <div className="grid grid-cols-4 border-t border-gray-700">
                  {ALL_STATUSES.map((s) => {
                    const btnCfg = STATUS_CONFIG[s];
                    const isActive = ss.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(ss.id, s)}
                        disabled={isUpdating}
                        className={`h-12 text-xs font-medium transition-colors ${
                          isActive
                            ? `${btnCfg.bg} ${btnCfg.text} ring-1 ${btnCfg.ring} ring-inset`
                            : "text-gray-400 hover:bg-gray-700 active:bg-gray-600"
                        } disabled:opacity-50`}
                      >
                        {isUpdating && isActive ? "…" : btnCfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
