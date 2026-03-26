"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INTEXTKR: Record<string, string> = { INT: "실내", EXT: "실외", INT_EXT: "실내외" };
const TIMEDAYKR: Record<string, string> = { D: "낮", N: "밤", DN: "저녁", ND: "새벽" };
const STATUS_LABELS: Record<string, string> = {
  WAITING: "대기",
  SHOOTING: "촬영중",
  COMPLETED: "완료",
  RESHOOT: "재촬영",
};
const STATUS_COLORS: Record<string, string> = {
  WAITING: "text-gray-500 bg-gray-50 border-gray-200",
  SHOOTING: "text-blue-700 bg-blue-50 border-blue-200",
  COMPLETED: "text-green-700 bg-green-50 border-green-200",
  RESHOOT: "text-amber-700 bg-amber-50 border-amber-200",
};

interface Scene {
  id: string;
  number: number;
  intExt: string;
  location: string;
  timeOfDay: string;
}

interface SceneStatus {
  id: string;
  sceneId: string;
  status: string;
  takes: number;
  notes: string | null;
  scene: Scene & {
    characters: Array<{ character: { name: string } }>;
    props: Array<{ prop: { name: string; status: string } }>;
  };
}

interface ShootingDay {
  id: string;
  location: string | null;
  callTime: string | null;
  shootTime: string | null;
  notes: string | null;
  sceneStatuses: SceneStatus[];
  callSheets: Array<{ id: string; callTime: string }>;
}

interface Props {
  projectId: string;
  scheduleId: string;
  dayId: string;
  day: ShootingDay;
  unassignedScenes: Scene[];
}

export function ShootingDayClient({
  projectId,
  scheduleId,
  dayId,
  day,
  unassignedScenes,
}: Props) {
  const router = useRouter();
  const [generatingCallSheet, setGeneratingCallSheet] = useState(false);

  async function assignScene(sceneId: string) {
    await fetch(
      `/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/scenes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId }),
      }
    );
    router.refresh();
  }

  async function removeScene(sceneId: string) {
    await fetch(
      `/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/scenes?sceneId=${sceneId}`,
      { method: "DELETE" }
    );
    router.refresh();
  }

  async function updateStatus(sceneStatusId: string, status: string) {
    await fetch(`/api/scene-statuses/${sceneStatusId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function generateCallSheet() {
    setGeneratingCallSheet(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) throw new Error("실패");
      router.refresh();
    } finally {
      setGeneratingCallSheet(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Scene list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            씬 목록 ({day.sceneStatuses.length})
          </h3>
          {unassignedScenes.length > 0 && (
            <SceneAssignDropdown
              scenes={unassignedScenes}
              onAssign={assignScene}
            />
          )}
        </div>

        {day.sceneStatuses.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
            배정된 씬이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {day.sceneStatuses.map((ss) => (
              <SceneStatusRow
                key={ss.id}
                ss={ss}
                onStatusChange={(status) => updateStatus(ss.id, status)}
                onRemove={() => removeScene(ss.sceneId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Call sheet section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">콜시트</h3>
          <div className="flex gap-2">
            {day.callSheets.length > 0 ? (
              <>
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" />
                  생성됨
                </span>
                <a
                  href={`/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  PDF 다운로드
                </a>
              </>
            ) : (
              <button
                onClick={generateCallSheet}
                disabled={generatingCallSheet || day.sceneStatuses.length === 0}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {generatingCallSheet ? "생성 중..." : "자동 생성"}
              </button>
            )}
          </div>
        </div>

        {day.callSheets.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            {day.sceneStatuses.length === 0
              ? "씬을 먼저 배정하세요"
              : "씬 배정 완료 후 콜시트를 자동 생성하세요"}
          </div>
        ) : (
          <div className="px-4 py-3 text-sm text-gray-600">
            콜시트가 생성되었습니다. 수정은 편집 기능을 사용하세요.
          </div>
        )}
      </div>
    </div>
  );
}

function SceneStatusRow({
  ss,
  onStatusChange,
  onRemove,
}: {
  ss: SceneStatus;
  onStatusChange: (status: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border border-gray-200 rounded-lg">
      <div className="text-xs font-mono text-blue-700 font-semibold w-8 mt-0.5">
        S{ss.scene.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {ss.scene.location}
          </span>
          <span className="text-xs text-gray-400">
            {INTEXTKR[ss.scene.intExt]} / {TIMEDAYKR[ss.scene.timeOfDay]}
          </span>
        </div>
        {ss.scene.characters.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">
            {ss.scene.characters.map((sc) => sc.character.name).join(", ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={ss.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${STATUS_COLORS[ss.status]}`}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          title="씬 제거"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function SceneAssignDropdown({
  scenes,
  onAssign,
}: {
  scenes: Scene[];
  onAssign: (sceneId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded px-2 py-1"
      >
        + 씬 추가
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {scenes.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onAssign(s.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-mono text-blue-700 w-6">
                  S{s.number}
                </span>
                <span className="flex-1 truncate text-gray-700">{s.location}</span>
                <span className="text-xs text-gray-400">
                  {TIMEDAYKR[s.timeOfDay]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
