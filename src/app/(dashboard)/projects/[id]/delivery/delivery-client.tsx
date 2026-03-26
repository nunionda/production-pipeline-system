"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────

type QCStatus = "IN_PROGRESS" | "PASSED" | "FAILED";
type MasterFileStatus = "CREATING" | "COMPLETED" | "VERIFIED";
type DeliveryTargetType = "BROADCAST" | "OTT" | "DISTRIBUTOR" | "INTERNATIONAL" | "OTHER";
type DeliveryTargetStatus = "PENDING" | "DELIVERED" | "APPROVED" | "REJECTED";

type QCIssue = { description: string; severity: "LOW" | "HIGH"; resolved: boolean };

type QCReport = {
  id: string;
  version: string;
  status: QCStatus;
  issues: QCIssue[] | null;
  technicalSpecs: string | null;
  notes: string | null;
};

type MasterFile = {
  id: string;
  name: string;
  format: string;
  resolution: string | null;
  codec: string | null;
  duration: string | null;
  fileSize: string | null;
  status: MasterFileStatus;
  notes: string | null;
};

type DeliveryTarget = {
  id: string;
  recipientName: string;
  type: DeliveryTargetType;
  format: string | null;
  deadline: Date | null;
  status: DeliveryTargetStatus;
  notes: string | null;
};

// ─── Labels & Colors ─────────────────────────

const QC_STATUS_LABELS: Record<QCStatus, string> = {
  IN_PROGRESS: "진행중",
  PASSED: "통과",
  FAILED: "불합격",
};
const QC_STATUS_COLORS: Record<QCStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PASSED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
};

const MASTER_STATUS_LABELS: Record<MasterFileStatus, string> = {
  CREATING: "생성중",
  COMPLETED: "완료",
  VERIFIED: "검증완료",
};
const MASTER_STATUS_COLORS: Record<MasterFileStatus, string> = {
  CREATING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-green-100 text-green-700",
};

const DELIVERY_TYPE_LABELS: Record<DeliveryTargetType, string> = {
  BROADCAST: "방송사",
  OTT: "OTT",
  DISTRIBUTOR: "배급사",
  INTERNATIONAL: "해외",
  OTHER: "기타",
};

const DELIVERY_STATUS_LABELS: Record<DeliveryTargetStatus, string> = {
  PENDING: "대기",
  DELIVERED: "전달완료",
  APPROVED: "승인",
  REJECTED: "반려",
};
const DELIVERY_STATUS_COLORS: Record<DeliveryTargetStatus, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  DELIVERED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
};

// ─── Main Component ───────────────────────────

type Tab = "qc" | "master" | "delivery";

export function DeliveryClient({
  projectId,
  initialQcReports,
  initialMasterFiles,
  initialDeliveryTargets,
}: {
  projectId: string;
  initialQcReports: QCReport[];
  initialMasterFiles: MasterFile[];
  initialDeliveryTargets: DeliveryTarget[];
}) {
  const [tab, setTab] = useState<Tab>("delivery");

  const tabs: { key: Tab; label: string }[] = [
    { key: "delivery", label: "배급사 전달" },
    { key: "master", label: "마스터 파일" },
    { key: "qc", label: "QC" },
  ];

  // Summary: approved count
  const approvedCount = initialDeliveryTargets.filter((t) => t.status === "APPROVED").length;
  const passedQC = initialQcReports.some((r) => r.status === "PASSED");
  const verifiedMasters = initialMasterFiles.filter((f) => f.status === "VERIFIED").length;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">납품</h2>

      {/* Status bar */}
      {(initialDeliveryTargets.length > 0 || initialQcReports.length > 0 || initialMasterFiles.length > 0) && (
        <div className="flex gap-6 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${passedQC ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="text-gray-600">QC {passedQC ? "통과" : "대기"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${verifiedMasters > 0 ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="text-gray-600">마스터 {verifiedMasters}/{initialMasterFiles.length} 검증</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${approvedCount > 0 ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="text-gray-600">배급사 {approvedCount}/{initialDeliveryTargets.length} 승인</span>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary-800 text-primary-800"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "delivery" && <DeliveryTab projectId={projectId} initialTargets={initialDeliveryTargets} />}
      {tab === "master" && <MasterTab projectId={projectId} initialFiles={initialMasterFiles} />}
      {tab === "qc" && <QCTab projectId={projectId} initialReports={initialQcReports} />}
    </div>
  );
}

// ─── Delivery Tab ─────────────────────────────

function DeliveryTab({ projectId, initialTargets }: { projectId: string; initialTargets: DeliveryTarget[] }) {
  const router = useRouter();
  const [targets, setTargets] = useState(initialTargets);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ recipientName: "", type: "BROADCAST" as DeliveryTargetType, format: "", deadline: "", notes: "" });

  const apiBase = `/api/projects/${projectId}/delivery-targets`;

  async function add() {
    if (!form.recipientName.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const t = await res.json();
      setTargets((prev) => [...prev, t]);
      setForm({ recipientName: "", type: "BROADCAST", format: "", deadline: "", notes: "" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: DeliveryTargetStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    }
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-3">
      {targets.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">배급사/방송사 전달 대상이 없습니다</p>
        </div>
      )}

      {targets.map((t) => (
        <div key={t.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{t.recipientName}</p>
              <span className="inline-flex rounded px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600">
                {DELIVERY_TYPE_LABELS[t.type]}
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${DELIVERY_STATUS_COLORS[t.status]}`}>
                {DELIVERY_STATUS_LABELS[t.status]}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              {t.format && <span>포맷: {t.format}</span>}
              {t.deadline && <span>마감: {new Date(t.deadline).toLocaleDateString("ko-KR")}</span>}
              {t.notes && <span>{t.notes}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            <div className="flex gap-1 flex-wrap justify-end">
              {(["PENDING", "DELIVERED", "APPROVED", "REJECTED"] as DeliveryTargetStatus[]).map((s) => (
                <button key={s} onClick={() => updateStatus(t.id, s)}
                  className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                    t.status === s ? DELIVERY_STATUS_COLORS[s] + " font-medium" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}>
                  {DELIVERY_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button onClick={() => del(t.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <div className="flex gap-2">
            <input autoFocus value={form.recipientName} onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="수령인 (예: KBS 2TV) *" />
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DeliveryTargetType }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
              {Object.entries(DELIVERY_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="납품 포맷 (예: UHD HDR MXF)" />
            <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving || !form.recipientName.trim()}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => setAdding(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 납품 대상 추가
        </button>
      )}
    </div>
  );
}

// ─── Master Files Tab ─────────────────────────

function MasterTab({ projectId, initialFiles }: { projectId: string; initialFiles: MasterFile[] }) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", format: "MOV", resolution: "", codec: "", duration: "", fileSize: "", notes: "" });

  const apiBase = `/api/projects/${projectId}/master-files`;

  async function add() {
    if (!form.name.trim() || !form.format.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const f = await res.json();
      setFiles((prev) => [f, ...prev]);
      setForm({ name: "", format: "MOV", resolution: "", codec: "", duration: "", fileSize: "", notes: "" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: MasterFileStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    }
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-3">
      {files.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">마스터 파일이 없습니다</p>
        </div>
      )}

      {files.map((f) => (
        <div key={f.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{f.name}</p>
              <span className="inline-flex rounded px-1.5 py-0.5 text-xs font-mono bg-gray-100 text-gray-700">{f.format}</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MASTER_STATUS_COLORS[f.status]}`}>
                {MASTER_STATUS_LABELS[f.status]}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              {f.resolution && <span>{f.resolution}</span>}
              {f.codec && <span>{f.codec}</span>}
              {f.duration && <span>{f.duration}</span>}
              {f.fileSize && <span>{f.fileSize}</span>}
            </div>
            {f.notes && <p className="text-xs text-gray-400">{f.notes}</p>}
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            <div className="flex gap-1">
              {(["CREATING", "COMPLETED", "VERIFIED"] as MasterFileStatus[]).map((s) => (
                <button key={s} onClick={() => updateStatus(f.id, s)}
                  className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                    f.status === s ? MASTER_STATUS_COLORS[s] + " font-medium" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}>
                  {MASTER_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button onClick={() => del(f.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <div className="flex gap-2">
            <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="파일명 (예: EP01_MASTER_4K) *" />
            <input value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
              className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="포맷 *" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input value={form.resolution} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="해상도" />
            <input value={form.codec} onChange={(e) => setForm((f) => ({ ...f, codec: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="코덱" />
            <input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="길이" />
            <input value={form.fileSize} onChange={(e) => setForm((f) => ({ ...f, fileSize: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="파일크기" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving || !form.name.trim() || !form.format.trim()}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => setAdding(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 마스터 파일 추가
        </button>
      )}
    </div>
  );
}

// ─── QC Tab ───────────────────────────────────

function QCTab({ projectId, initialReports }: { projectId: string; initialReports: QCReport[] }) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ version: "", status: "IN_PROGRESS" as QCStatus, technicalSpecs: "", notes: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newIssue, setNewIssue] = useState({ description: "", severity: "LOW" as "LOW" | "HIGH" });

  const apiBase = `/api/projects/${projectId}/qc-reports`;

  async function add() {
    if (!form.version.trim()) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const r = await res.json();
      setReports((prev) => [r, ...prev]);
      setForm({ version: "", status: "IN_PROGRESS", technicalSpecs: "", notes: "" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: QCStatus) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }
  }

  async function addIssue(reportId: string, currentIssues: QCIssue[] | null) {
    if (!newIssue.description.trim()) return;
    const issues = [...(currentIssues ?? []), { ...newIssue, resolved: false }];
    const res = await fetch(`${apiBase}/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issues }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
      setNewIssue({ description: "", severity: "LOW" });
    }
  }

  async function toggleIssue(reportId: string, issues: QCIssue[] | null, idx: number) {
    const updated = (issues ?? []).map((issue, i) =>
      i === idx ? { ...issue, resolved: !issue.resolved } : issue
    );
    const res = await fetch(`${apiBase}/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issues: updated }),
    });
    if (res.ok) {
      const r = await res.json();
      setReports((prev) => prev.map((rep) => (rep.id === reportId ? r : rep)));
    }
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-3">
      {reports.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">QC 리포트가 없습니다</p>
        </div>
      )}

      {reports.map((r) => {
        const issues = r.issues ?? [];
        const unresolvedCount = issues.filter((i) => !i.resolved).length;
        const isExpanded = expandedId === r.id;
        return (
          <div key={r.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">QC {r.version}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${QC_STATUS_COLORS[r.status]}`}>
                    {QC_STATUS_LABELS[r.status]}
                  </span>
                  {issues.length > 0 && (
                    <span className={`text-xs ${unresolvedCount > 0 ? "text-red-600" : "text-green-600"}`}>
                      이슈 {unresolvedCount > 0 ? `${unresolvedCount}건 미해결` : "모두 해결"}
                    </span>
                  )}
                </div>
                {r.technicalSpecs && <p className="text-xs text-gray-500">{r.technicalSpecs}</p>}
                {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <div className="flex gap-1">
                  {(["IN_PROGRESS", "PASSED", "FAILED"] as QCStatus[]).map((s) => (
                    <button key={s} onClick={() => updateStatus(r.id, s)}
                      className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                        r.status === s ? QC_STATUS_COLORS[s] + " font-medium" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}>
                      {QC_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="text-xs text-blue-600 hover:text-blue-800">
                    이슈 {isExpanded ? "접기" : `${issues.length}건`}
                  </button>
                  <button onClick={() => del(r.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                {issues.length === 0 && <p className="text-xs text-gray-400">이슈 없음</p>}
                {issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <button onClick={() => toggleIssue(r.id, r.issues, idx)}
                      className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                        issue.resolved ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                      }`}>
                      {issue.resolved && "✓"}
                    </button>
                    <div className="flex-1">
                      <span className={`text-xs ${issue.resolved ? "line-through text-gray-400" : "text-gray-700"}`}>
                        {issue.description}
                      </span>
                      <span className={`ml-2 text-xs ${issue.severity === "HIGH" ? "text-red-500" : "text-gray-400"}`}>
                        {issue.severity === "HIGH" ? "심각" : "경미"}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <input value={newIssue.description} onChange={(e) => setNewIssue((f) => ({ ...f, description: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addIssue(r.id, r.issues)}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-800"
                    placeholder="이슈 내용" />
                  <select value={newIssue.severity} onChange={(e) => setNewIssue((f) => ({ ...f, severity: e.target.value as "LOW" | "HIGH" }))}
                    className="rounded border border-gray-300 px-1.5 py-1 text-xs focus:outline-none">
                    <option value="LOW">경미</option>
                    <option value="HIGH">심각</option>
                  </select>
                  <button onClick={() => addIssue(r.id, r.issues)} disabled={!newIssue.description.trim()}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-40">추가</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-2 bg-primary-50">
          <div className="flex gap-2">
            <input autoFocus value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
              placeholder="버전 (v1)" />
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as QCStatus }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
              {Object.entries(QC_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <input value={form.technicalSpecs} onChange={(e) => setForm((f) => ({ ...f, technicalSpecs: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="기술 스펙 (예: UHD 4K HDR10, 23.976fps)" />
          <div className="flex gap-2">
            <button onClick={add} disabled={saving || !form.version.trim()}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => setAdding(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + QC 리포트 추가
        </button>
      )}
    </div>
  );
}
