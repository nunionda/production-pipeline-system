"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const INTEXTKR: Record<string, string> = { INT: "실내", EXT: "실외", INT_EXT: "실내외" };
const TIMEDAYKR: Record<string, string> = { D: "낮", N: "밤", DN: "저녁", ND: "새벽" };

const STATUS_LABELS: Record<string, string> = {
  WAITING: "대기", SHOOTING: "촬영중", COMPLETED: "완료", RESHOOT: "재촬영",
};
const STATUS_COLORS: Record<string, string> = {
  WAITING: "text-gray-500 bg-gray-50 border-gray-200",
  SHOOTING: "text-blue-700 bg-blue-50 border-blue-200",
  COMPLETED: "text-green-700 bg-green-50 border-green-200",
  RESHOOT: "text-amber-700 bg-amber-50 border-amber-200",
};
const STATUS_DOT: Record<string, string> = {
  WAITING: "bg-gray-400", SHOOTING: "bg-blue-600",
  COMPLETED: "bg-green-600", RESHOOT: "bg-amber-500",
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  DIALOGUE: "대사 변경", BLOCKING: "동선 변경", PROP: "소품 변경",
  SCENE_ADD: "씬 추가", SCENE_DELETE: "씬 삭제", OTHER: "기타",
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  READY: "준비완료", IN_USE: "사용중", DAMAGED: "손상", LOST: "분실",
};
const ASSET_STATUS_COLORS: Record<string, string> = {
  READY: "text-green-700 bg-green-50 border-green-200",
  IN_USE: "text-blue-700 bg-blue-50 border-blue-200",
  DAMAGED: "text-amber-700 bg-amber-50 border-amber-200",
  LOST: "text-red-700 bg-red-50 border-red-200",
};

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Scene {
  id: string; number: number; intExt: string; location: string; timeOfDay: string;
}
interface SceneStatus {
  id: string; sceneId: string; status: string; takes: number; notes: string | null;
  scene: Scene & {
    characters: Array<{ character: { name: string } }>;
    props: Array<{ prop: { name: string; status: string } }>;
  };
}
interface ShootingDay {
  id: string; location: string | null; callTime: string | null;
  shootTime: string | null; notes: string | null;
  sceneStatuses: SceneStatus[];
  callSheets: Array<{ id: string; callTime: string }>;
}

interface Props {
  projectId: string; scheduleId: string; dayId: string;
  day: ShootingDay;
  unassignedScenes: Scene[];
  projectProps: Array<{ id: string; name: string }>;
  projectCostumes: Array<{ id: string; name: string }>;
}

type Tab = "scenes" | "changes" | "assets" | "report";

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function ShootingDayClient({
  projectId, scheduleId, dayId, day, unassignedScenes, projectProps, projectCostumes,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scenes");
  const [generatingCallSheet, setGeneratingCallSheet] = useState(false);

  const basePath = `/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}`;

  async function assignScene(sceneId: string) {
    await fetch(`${basePath}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneId }),
    });
    router.refresh();
  }

  async function removeScene(sceneId: string) {
    await fetch(`${basePath}/scenes?sceneId=${sceneId}`, { method: "DELETE" });
    router.refresh();
  }

  async function updateSceneStatus(sceneStatusId: string, status: string) {
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
      await fetch(`${basePath}/call-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setGeneratingCallSheet(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "scenes", label: `씬 (${day.sceneStatuses.length})` },
    { id: "changes", label: "현장 변경" },
    { id: "assets", label: "자산 상태" },
    { id: "report", label: "일일 리포트" },
  ];

  return (
    <div className="space-y-4">
      {/* Call sheet bar */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
        <span className="text-xs font-medium text-gray-600">콜시트</span>
        <div className="flex items-center gap-3">
          {day.callSheets.length > 0 ? (
            <>
              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" />
                생성됨
              </span>
              <a
                href={`/projects/${projectId}/schedule/${scheduleId}/day/${dayId}/live`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-purple-700 hover:text-purple-900"
              >
                라이브 뷰 ↗
              </a>
              <a
                href={`/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet/pdf`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-blue-700 hover:text-blue-900"
              >
                PDF 다운로드 ↓
              </a>
              <ShareCallSheetButton
                projectId={projectId}
                scheduleId={scheduleId}
                dayId={dayId}
              />
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-700 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === "scenes" && (
        <ScenesTab
          day={day}
          unassignedScenes={unassignedScenes}
          onAssign={assignScene}
          onRemove={removeScene}
          onStatusChange={updateSceneStatus}
        />
      )}
      {tab === "changes" && (
        <FieldChangesTab
          projectId={projectId} scheduleId={scheduleId} dayId={dayId}
          scenes={day.sceneStatuses.map((ss) => ss.scene)}
          basePath={basePath}
          onSaved={() => router.refresh()}
        />
      )}
      {tab === "assets" && (
        <AssetLogsTab
          projectId={projectId} scheduleId={scheduleId} dayId={dayId}
          projectProps={projectProps} projectCostumes={projectCostumes}
          basePath={basePath}
          onSaved={() => router.refresh()}
        />
      )}
      {tab === "report" && (
        <DailyReportTab
          projectId={projectId} scheduleId={scheduleId} dayId={dayId}
          basePath={basePath}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Scenes Tab
// ──────────────────────────────────────────────

function ScenesTab({
  day, unassignedScenes, onAssign, onRemove, onStatusChange,
}: {
  day: ShootingDay;
  unassignedScenes: Scene[];
  onAssign: (id: string) => void;
  onRemove: (id: string) => void;
  onStatusChange: (ssId: string, status: string) => void;
}) {
  // Summary counts
  const counts = Object.keys(STATUS_LABELS).reduce((acc, k) => {
    acc[k] = day.sceneStatuses.filter((ss) => ss.status === k).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-3">
      {/* Status summary */}
      {day.sceneStatuses.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <div key={k} className="text-center bg-gray-50 rounded-lg py-2 px-1">
              <div className="text-lg font-semibold text-gray-900">{counts[k]}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">
          {day.sceneStatuses.length > 0 ? `${day.sceneStatuses.length}개 씬 배정됨` : "배정된 씬 없음"}
        </span>
        {unassignedScenes.length > 0 && (
          <SceneAssignDropdown scenes={unassignedScenes} onAssign={onAssign} />
        )}
      </div>

      {day.sceneStatuses.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
          씬을 배정하세요
        </div>
      ) : (
        <div className="space-y-2">
          {day.sceneStatuses.map((ss) => (
            <SceneStatusRow
              key={ss.id} ss={ss}
              onStatusChange={(s) => onStatusChange(ss.id, s)}
              onRemove={() => onRemove(ss.sceneId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SceneStatusRow({
  ss, onStatusChange, onRemove,
}: { ss: SceneStatus; onStatusChange: (s: string) => void; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-2 mt-0.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[ss.status]}`} />
        <span className="text-xs font-mono text-blue-700 font-semibold w-6">{ss.scene.number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 truncate">{ss.scene.location}</span>
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
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={onRemove} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Field Changes Tab
// ──────────────────────────────────────────────

function FieldChangesTab({
  basePath, scenes, onSaved,
}: {
  projectId: string; scheduleId: string; dayId: string;
  scenes: Scene[];
  basePath: string;
  onSaved: () => void;
}) {
  const [changes, setChanges] = useState<Array<{
    id: string; changeType: string; description: string;
    approvedBy: string | null; createdAt: string;
    scene: { number: number; location: string } | null;
  }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    changeType: "DIALOGUE",
    description: "",
    sceneId: "",
    approvedBy: "",
  });

  async function load() {
    const res = await fetch(`${basePath}/field-changes`);
    setChanges(await res.json());
    setLoaded(true);
  }

  if (!loaded) {
    load();
    return <div className="py-8 text-center text-sm text-gray-400">불러오는 중...</div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${basePath}/field-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType: form.changeType,
          description: form.description,
          sceneId: form.sceneId || null,
          approvedBy: form.approvedBy || null,
        }),
      });
      if (!res.ok) throw new Error("실패");
      const newChange = await res.json();
      setChanges([newChange, ...changes]);
      setForm({ changeType: "DIALOGUE", description: "", sceneId: "", approvedBy: "" });
      setShowForm(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{changes.length}건의 현장 변경</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded px-2 py-1"
        >
          + 변경 기록
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">변경 유형</label>
              <select
                value={form.changeType}
                onChange={(e) => setForm({ ...form, changeType: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CHANGE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">관련 씬</label>
              <select
                value={form.sceneId}
                onChange={(e) => setForm({ ...form, sceneId: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">없음</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>S{s.number} {s.location}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">내용 <span className="text-red-500">*</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="변경 내용을 입력하세요"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">승인자</label>
            <input
              type="text"
              value={form.approvedBy}
              onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="PD 이름"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 rounded bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              취소
            </button>
          </div>
        </form>
      )}

      {changes.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
          현장 변경 기록이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {changes.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                    {CHANGE_TYPE_LABELS[c.changeType]}
                  </span>
                  {c.scene && (
                    <span className="text-xs text-gray-500">S{c.scene.number}</span>
                  )}
                </div>
                {c.approvedBy && (
                  <span className="text-xs text-green-700">✓ {c.approvedBy} 승인</span>
                )}
              </div>
              <p className="text-sm text-gray-700 mt-1">{c.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(c.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Asset Logs Tab
// ──────────────────────────────────────────────

function AssetLogsTab({
  basePath, projectProps, projectCostumes, onSaved,
}: {
  projectId: string; scheduleId: string; dayId: string;
  projectProps: Array<{ id: string; name: string }>;
  projectCostumes: Array<{ id: string; name: string }>;
  basePath: string;
  onSaved: () => void;
}) {
  const [logs, setLogs] = useState<Array<{
    id: string; assetStatus: string; notes: string | null; createdAt: string;
    prop: { id: string; name: string } | null;
    costume: { id: string; name: string } | null;
  }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ assetType: "prop", assetId: "", assetStatus: "READY", notes: "" });

  async function load() {
    const res = await fetch(`${basePath}/asset-logs`);
    setLogs(await res.json());
    setLoaded(true);
  }

  if (!loaded) {
    load();
    return <div className="py-8 text-center text-sm text-gray-400">불러오는 중...</div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        propId: form.assetType === "prop" ? form.assetId : null,
        costumeId: form.assetType === "costume" ? form.assetId : null,
        assetStatus: form.assetStatus,
        notes: form.notes || null,
      };
      const res = await fetch(`${basePath}/asset-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("실패");
      const newLog = await res.json();
      setLogs([newLog, ...logs]);
      setForm({ assetType: "prop", assetId: "", assetStatus: "READY", notes: "" });
      setShowForm(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{logs.length}건의 자산 기록</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded px-2 py-1"
        >
          + 자산 상태 기록
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">자산 유형</label>
              <select
                value={form.assetType}
                onChange={(e) => setForm({ ...form, assetType: e.target.value, assetId: "" })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="prop">소품</option>
                <option value="costume">의상</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {form.assetType === "prop" ? "소품" : "의상"} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.assetId}
                onChange={(e) => setForm({ ...form, assetId: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">선택...</option>
                {(form.assetType === "prop" ? projectProps : projectCostumes).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">상태</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(ASSET_STATUS_LABELS).map(([k, v]) => (
                <button
                  key={k} type="button"
                  onClick={() => setForm({ ...form, assetStatus: k })}
                  className={`text-xs border rounded px-2.5 py-1 transition-colors ${
                    form.assetStatus === k ? ASSET_STATUS_COLORS[k] : "text-gray-500 bg-white border-gray-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">메모</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="추가 메모"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 rounded bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              취소
            </button>
          </div>
        </form>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
          자산 상태 기록이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const assetName = log.prop?.name || log.costume?.name || "알 수 없음";
            const assetType = log.prop ? "소품" : "의상";
            return (
              <div key={log.id} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{assetType}</span>
                    <span className="text-sm font-medium text-gray-900">{assetName}</span>
                  </div>
                  {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                </div>
                <span className={`text-xs border rounded px-2 py-0.5 flex-shrink-0 ${ASSET_STATUS_COLORS[log.assetStatus]}`}>
                  {ASSET_STATUS_LABELS[log.assetStatus]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Daily Report Tab
// ──────────────────────────────────────────────

function DailyReportTab({
  basePath,
}: {
  projectId: string; scheduleId: string; dayId: string; basePath: string;
}) {
  const [report, setReport] = useState<{
    id?: string; setupCount: number; overtimeHours: number; notes: string;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`${basePath}/daily-report`);
    const data = await res.json();
    setReport(data ?? { setupCount: 0, overtimeHours: 0, notes: "" });
    setLoaded(true);
  }

  if (!loaded) {
    load();
    return <div className="py-8 text-center text-sm text-gray-400">불러오는 중...</div>;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!report) return;
    setSaving(true);
    try {
      const res = await fetch(`${basePath}/daily-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupCount: report.setupCount,
          overtimeHours: report.overtimeHours,
          notes: report.notes,
        }),
      });
      const saved = await res.json();
      setReport({ ...saved, notes: saved.notes ?? "" });
    } finally {
      setSaving(false);
    }
  }

  if (!report) return null;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">셋업 횟수</label>
          <input
            type="number" min={0}
            value={report.setupCount}
            onChange={(e) => setReport({ ...report, setupCount: Number(e.target.value) })}
            className="w-full text-2xl font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0"
          />
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">초과 근무 (시간)</label>
          <input
            type="number" min={0} step={0.5}
            value={report.overtimeHours}
            onChange={(e) => setReport({ ...report, overtimeHours: Number(e.target.value) })}
            className="w-full text-2xl font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">특이사항 / 메모</label>
        <textarea
          rows={4}
          value={report.notes}
          onChange={(e) => setReport({ ...report, notes: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="오늘 촬영 특이사항을 기록하세요"
        />
      </div>

      <button
        type="submit" disabled={saving}
        className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
      >
        {saving ? "저장 중..." : (report.id ? "리포트 업데이트" : "리포트 저장")}
      </button>
    </form>
  );
}

// ──────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────

function ShareCallSheetButton({
  projectId,
  scheduleId,
  dayId,
}: {
  projectId: string;
  scheduleId: string;
  dayId: string;
}) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setSharing(true);
    const res = await fetch(
      `/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet/share`,
      { method: "POST" }
    );
    setSharing(false);
    if (!res.ok) return;
    const data = await res.json();
    const url = `${window.location.origin}/c/${data.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className="text-xs font-medium text-green-700 hover:text-green-900 disabled:text-gray-400"
    >
      {sharing ? "생성 중…" : copied ? "링크 복사됨!" : "공유 링크"}
    </button>
  );
}

function SceneAssignDropdown({ scenes, onAssign }: { scenes: Scene[]; onAssign: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded px-2 py-1">
        + 씬 추가
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {scenes.map((s) => (
              <button key={s.id} onClick={() => { onAssign(s.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors">
                <span className="text-xs font-mono text-blue-700 w-6">S{s.number}</span>
                <span className="flex-1 truncate text-gray-700">{s.location}</span>
                <span className="text-xs text-gray-400">{TIMEDAYKR[s.timeOfDay]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
