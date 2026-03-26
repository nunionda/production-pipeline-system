"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────

type EditStatus = "ROUGH_CUT" | "FINE_CUT" | "PICTURE_LOCK" | "FINAL";
type VFXStatus = "WAITING" | "IN_PROGRESS" | "REVIEW" | "REVISION" | "APPROVED";
type SoundType = "ADR" | "FOLEY" | "SFX" | "MUSIC" | "MIX" | "MASTER";
type PostStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";

type EditVersion = {
  id: string;
  versionNumber: number;
  editor: string | null;
  status: EditStatus;
  notes: string | null;
};

type VFXShot = {
  id: string;
  shotName: string;
  description: string | null;
  vendor: string | null;
  status: VFXStatus;
  deadline: Date | null;
  revisionCount: number;
  notes: string | null;
};

type SoundTask = {
  id: string;
  type: SoundType;
  description: string | null;
  assignee: string | null;
  status: PostStatus;
  deadline: Date | null;
  notes: string | null;
};

type ColorSession = {
  id: string;
  colorist: string | null;
  status: PostStatus;
  sessionDate: Date | null;
  notes: string | null;
};

// ─── Labels & Colors ────────────────────────────

const EDIT_STATUS_LABELS: Record<EditStatus, string> = {
  ROUGH_CUT: "러프컷",
  FINE_CUT: "파인컷",
  PICTURE_LOCK: "픽처락",
  FINAL: "최종",
};
const EDIT_STATUS_COLORS: Record<EditStatus, string> = {
  ROUGH_CUT: "bg-gray-100 text-gray-600",
  FINE_CUT: "bg-blue-100 text-blue-700",
  PICTURE_LOCK: "bg-amber-100 text-amber-700",
  FINAL: "bg-green-100 text-green-700",
};

const VFX_STATUS_LABELS: Record<VFXStatus, string> = {
  WAITING: "대기",
  IN_PROGRESS: "작업중",
  REVIEW: "리뷰",
  REVISION: "수정",
  APPROVED: "승인",
};
const VFX_STATUS_COLORS: Record<VFXStatus, string> = {
  WAITING: "bg-gray-100 text-gray-500",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  REVIEW: "bg-purple-100 text-purple-700",
  REVISION: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
};

const SOUND_TYPE_LABELS: Record<SoundType, string> = {
  ADR: "ADR",
  FOLEY: "폴리",
  SFX: "효과음",
  MUSIC: "음악",
  MIX: "믹싱",
  MASTER: "마스터링",
};

const POST_STATUS_LABELS: Record<PostStatus, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  ON_HOLD: "보류",
};
const POST_STATUS_COLORS: Record<PostStatus, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
};

// ─── Main Component ─────────────────────────────

type Tab = "edit" | "vfx" | "sound" | "color";

export function PostProductionClient({
  projectId,
  initialEditVersions,
  initialVfxShots,
  initialSoundTasks,
  initialColorSessions,
}: {
  projectId: string;
  initialEditVersions: EditVersion[];
  initialVfxShots: VFXShot[];
  initialSoundTasks: SoundTask[];
  initialColorSessions: ColorSession[];
}) {
  const [tab, setTab] = useState<Tab>("edit");

  const tabs: { key: Tab; label: string }[] = [
    { key: "edit", label: "편집" },
    { key: "vfx", label: "VFX" },
    { key: "sound", label: "사운드" },
    { key: "color", label: "색보정" },
  ];

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">포스트프로덕션</h2>

      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary-800 text-primary-800"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "edit" && (
        <EditTab projectId={projectId} initialVersions={initialEditVersions} />
      )}
      {tab === "vfx" && (
        <VFXTab projectId={projectId} initialShots={initialVfxShots} />
      )}
      {tab === "sound" && (
        <SoundTab projectId={projectId} initialTasks={initialSoundTasks} />
      )}
      {tab === "color" && (
        <ColorTab projectId={projectId} initialSessions={initialColorSessions} />
      )}
    </div>
  );
}

// ─── Edit Tab ────────────────────────────────────

function EditTab({ projectId, initialVersions }: { projectId: string; initialVersions: EditVersion[] }) {
  const router = useRouter();
  const [versions, setVersions] = useState(initialVersions);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ editor: "", status: "ROUGH_CUT" as EditStatus, notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ editor: "", status: "ROUGH_CUT" as EditStatus, notes: "" });

  const apiBase = `/api/projects/${projectId}/edit-versions`;

  async function add() {
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const v = await res.json();
      setVersions((prev) => [v, ...prev]);
      setForm({ editor: "", status: "ROUGH_CUT", notes: "" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function save(id: string) {
    setSaving(true);
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setVersions((prev) => prev.map((v) => (v.id === id ? updated : v)));
      setEditingId(null);
    }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setVersions((prev) => prev.filter((v) => v.id !== id));
  }

  // Determine latest status
  const latestStatus = versions[0]?.status;

  return (
    <div className="space-y-4">
      {versions.length > 0 && latestStatus && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <span className="text-sm text-gray-500">현재 편집 상태</span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${EDIT_STATUS_COLORS[latestStatus]}`}>
            {EDIT_STATUS_LABELS[latestStatus]}
          </span>
          <span className="text-xs text-gray-400">v{versions[0].versionNumber}</span>
        </div>
      )}

      {/* Progress stepper */}
      {versions.length > 0 && (
        <div className="flex items-center gap-2">
          {(["ROUGH_CUT", "FINE_CUT", "PICTURE_LOCK", "FINAL"] as EditStatus[]).map((s, i) => {
            const done = versions.some((v) => v.status === s);
            const current = latestStatus === s;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-8 ${done ? "bg-green-400" : "bg-gray-200"}`} />}
                <div className={`flex flex-col items-center`}>
                  <div className={`w-3 h-3 rounded-full ${current ? "bg-primary-800 ring-2 ring-primary-200" : done ? "bg-green-500" : "bg-gray-200"}`} />
                  <span className="text-xs text-gray-500 mt-1 whitespace-nowrap">{EDIT_STATUS_LABELS[s]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {versions.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">편집 버전이 없습니다</p>
        </div>
      )}

      {versions.map((v) => (
        <div key={v.id} className="border border-gray-200 rounded-lg p-4">
          {editingId === v.id ? (
            <div className="space-y-2">
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as EditStatus }))}
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
                {Object.entries(EDIT_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <input value={editForm.editor} onChange={(e) => setEditForm((f) => ({ ...f, editor: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="편집자" />
              <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800 resize-none"
                placeholder="메모" />
              <div className="flex gap-2">
                <button onClick={() => save(v.id)} disabled={saving}
                  className="rounded bg-primary-800 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">저장</button>
                <button onClick={() => setEditingId(null)}
                  className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600">취소</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">v{v.versionNumber}</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EDIT_STATUS_COLORS[v.status]}`}>
                    {EDIT_STATUS_LABELS[v.status]}
                  </span>
                  {v.editor && <span className="text-xs text-gray-500">{v.editor}</span>}
                </div>
                {v.notes && <p className="text-xs text-gray-500">{v.notes}</p>}
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => { setEditingId(v.id); setEditForm({ editor: v.editor ?? "", status: v.status, notes: v.notes ?? "" }); }}
                  className="text-xs text-gray-400 hover:text-gray-600">수정</button>
                <button onClick={() => del(v.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EditStatus }))}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
            {Object.entries(EDIT_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input autoFocus value={form.editor} onChange={(e) => setForm((f) => ({ ...f, editor: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="편집자" />
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800 resize-none"
            placeholder="메모" />
          <div className="flex gap-2">
            <button onClick={add} disabled={saving}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => setAdding(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 편집 버전 추가
        </button>
      )}
    </div>
  );
}

// ─── VFX Tab ─────────────────────────────────────

function VFXTab({ projectId, initialShots }: { projectId: string; initialShots: VFXShot[] }) {
  const router = useRouter();
  const [shots, setShots] = useState(initialShots);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ shotName: "", description: "", vendor: "", status: "WAITING" as VFXStatus, deadline: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...form, revisionCount: 0 });

  const apiBase = `/api/projects/${projectId}/vfx-shots`;

  async function add() {
    if (!form.shotName.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const s = await res.json();
      setShots((prev) => [...prev, s]);
      setForm({ shotName: "", description: "", vendor: "", status: "WAITING", deadline: "" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: VFXStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setShots((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    }
  }

  async function save(id: string) {
    setSaving(true);
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setShots((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
    }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setShots((prev) => prev.filter((s) => s.id !== id));
  }

  const approved = shots.filter((s) => s.status === "APPROVED").length;

  return (
    <div className="space-y-4">
      {shots.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">{shots.length}개 VFX 샷</span>
          <span className="text-green-700 font-medium">{approved} 승인</span>
          <span className="text-amber-700">{shots.filter((s) => s.status === "REVISION").length} 수정중</span>
        </div>
      )}

      {shots.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">VFX 샷이 없습니다</p>
        </div>
      )}

      {shots.map((s) => (
        <div key={s.id} className="border border-gray-200 rounded-lg p-4">
          {editingId === s.id ? (
            <div className="space-y-2">
              <input value={editForm.shotName} onChange={(e) => setEditForm((f) => ({ ...f, shotName: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="샷명 *" />
              <div className="flex gap-2">
                <input value={editForm.vendor} onChange={(e) => setEditForm((f) => ({ ...f, vendor: e.target.value }))}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                  placeholder="업체" />
                <input type="date" value={editForm.deadline} onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800" />
              </div>
              <div className="flex gap-2 items-center">
                <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as VFXStatus }))}
                  className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
                  {Object.entries(VFX_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <label className="text-xs text-gray-500">수정 횟수</label>
                <input type="number" value={editForm.revisionCount} onChange={(e) => setEditForm((f) => ({ ...f, revisionCount: Number(e.target.value) }))}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => save(s.id)} disabled={saving}
                  className="rounded bg-primary-800 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">저장</button>
                <button onClick={() => setEditingId(null)}
                  className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600">취소</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{s.shotName}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${VFX_STATUS_COLORS[s.status]}`}>
                    {VFX_STATUS_LABELS[s.status]}
                  </span>
                </div>
                {s.vendor && <p className="text-xs text-gray-500">업체: {s.vendor}</p>}
                {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                <div className="flex gap-3 text-xs text-gray-400">
                  {s.deadline && <span>마감: {new Date(s.deadline).toLocaleDateString("ko-KR")}</span>}
                  {s.revisionCount > 0 && <span>수정 {s.revisionCount}회</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <div className="flex gap-2">
                  <button onClick={() => {
                    setEditingId(s.id);
                    setEditForm({ shotName: s.shotName, description: s.description ?? "", vendor: s.vendor ?? "", status: s.status, deadline: s.deadline ? new Date(s.deadline).toISOString().split("T")[0] : "", revisionCount: s.revisionCount });
                  }} className="text-xs text-gray-400 hover:text-gray-600">수정</button>
                  <button onClick={() => del(s.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                </div>
                <div className="flex gap-1">
                  {(["WAITING", "IN_PROGRESS", "REVIEW", "REVISION", "APPROVED"] as VFXStatus[]).map((st) => (
                    <button key={st} onClick={() => updateStatus(s.id, st)}
                      className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                        s.status === st ? VFX_STATUS_COLORS[st] + " font-medium" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}>
                      {VFX_STATUS_LABELS[st]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <input autoFocus value={form.shotName} onChange={(e) => setForm((f) => ({ ...f, shotName: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="샷명 (예: S03_VFX_001) *" />
          <div className="flex gap-2">
            <input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="업체" />
            <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving || !form.shotName.trim()}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => setAdding(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + VFX 샷 추가
        </button>
      )}
    </div>
  );
}

// ─── Sound Tab ───────────────────────────────────

function SoundTab({ projectId, initialTasks }: { projectId: string; initialTasks: SoundTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "MIX" as SoundType, description: "", assignee: "", status: "PENDING" as PostStatus, deadline: "" });

  const apiBase = `/api/projects/${projectId}/sound-tasks`;

  async function add() {
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const t = await res.json();
      setTasks((prev) => [...prev, t]);
      setForm({ type: "MIX", description: "", assignee: "", status: "PENDING", deadline: "" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: PostStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    }
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const completed = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-4">
      {tasks.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-green-700 font-medium">{completed}/{tasks.length} 완료</span>
        </div>
      )}

      {tasks.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">사운드 작업이 없습니다</p>
        </div>
      )}

      {(["ADR", "FOLEY", "SFX", "MUSIC", "MIX", "MASTER"] as SoundType[]).map((type) => {
        const typeTasks = tasks.filter((t) => t.type === type);
        if (typeTasks.length === 0) return null;
        return (
          <div key={type}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{SOUND_TYPE_LABELS[type]}</h3>
            <div className="space-y-2">
              {typeTasks.map((t) => (
                <div key={t.id} className="border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${POST_STATUS_COLORS[t.status]}`}>
                        {POST_STATUS_LABELS[t.status]}
                      </span>
                      {t.description && <p className="text-sm text-gray-900">{t.description}</p>}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-400">
                      {t.assignee && <span>{t.assignee}</span>}
                      {t.deadline && <span>마감: {new Date(t.deadline).toLocaleDateString("ko-KR")}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-4">
                    <div className="flex gap-1">
                      {(["PENDING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as PostStatus[]).map((s) => (
                        <button key={s} onClick={() => updateStatus(t.id, s)}
                          className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                            t.status === s ? POST_STATUS_COLORS[s] + " font-medium" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}>
                          {POST_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => del(t.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <div className="flex gap-2">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SoundType }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
              {Object.entries(SOUND_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="담당자" />
            <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800" />
          </div>
          <input autoFocus value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="작업 설명 (예: 주인공 씬 1-20 ADR)" />
          <div className="flex gap-2">
            <button onClick={add} disabled={saving}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => setAdding(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 사운드 작업 추가
        </button>
      )}
    </div>
  );
}

// ─── Color Grading Tab ───────────────────────────

function ColorTab({ projectId, initialSessions }: { projectId: string; initialSessions: ColorSession[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ colorist: "", status: "PENDING" as PostStatus, sessionDate: "", notes: "" });

  const apiBase = `/api/projects/${projectId}/color-grading`;

  async function add() {
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const s = await res.json();
      setSessions((prev) => [s, ...prev]);
      setForm({ colorist: "", status: "PENDING", sessionDate: "", notes: "" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: PostStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    }
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      {sessions.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">색보정 세션이 없습니다</p>
        </div>
      )}

      {sessions.map((s) => (
        <div key={s.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${POST_STATUS_COLORS[s.status]}`}>
                {POST_STATUS_LABELS[s.status]}
              </span>
              {s.colorist && <p className="text-sm font-medium text-gray-900">{s.colorist}</p>}
            </div>
            {s.sessionDate && (
              <p className="text-xs text-gray-500">
                세션 날짜: {new Date(s.sessionDate).toLocaleDateString("ko-KR")}
              </p>
            )}
            {s.notes && <p className="text-xs text-gray-400">{s.notes}</p>}
          </div>
          <div className="flex flex-col items-end gap-1.5 ml-4">
            <div className="flex gap-1">
              {(["PENDING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as PostStatus[]).map((st) => (
                <button key={st} onClick={() => updateStatus(s.id, st)}
                  className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                    s.status === st ? POST_STATUS_COLORS[st] + " font-medium" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}>
                  {POST_STATUS_LABELS[st]}
                </button>
              ))}
            </div>
            <button onClick={() => del(s.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <div className="flex gap-2">
            <input autoFocus value={form.colorist} onChange={(e) => setForm((f) => ({ ...f, colorist: e.target.value }))}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="색보정 담당자" />
            <input type="date" value={form.sessionDate} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800" />
          </div>
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PostStatus }))}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
            {Object.entries(POST_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800 resize-none"
            placeholder="메모" />
          <div className="flex gap-2">
            <button onClick={add} disabled={saving}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => setAdding(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 색보정 세션 추가
        </button>
      )}
    </div>
  );
}
