"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Phase =
  | "DEVELOPMENT"
  | "PRE_PRODUCTION"
  | "PRODUCTION"
  | "POST_PRODUCTION"
  | "DELIVERY"
  | "COMPLETED";

type Expense = { id: string; amount: number; note: string | null; date: string };

type BudgetLine = {
  id: string;
  category: string;
  description: string;
  estimatedAmount: number;
  actualAmount: number;
  phase: Phase;
  expenses?: Expense[];
};

function getLineActual(line: BudgetLine): number {
  if (!line.expenses || line.expenses.length === 0) return line.actualAmount;
  return line.expenses.reduce((s, e) => s + e.amount, 0);
}

const PHASE_LABELS: Record<Phase, string> = {
  DEVELOPMENT: "기획",
  PRE_PRODUCTION: "프리프로덕션",
  PRODUCTION: "촬영",
  POST_PRODUCTION: "포스트",
  DELIVERY: "납품",
  COMPLETED: "완료",
};

const CATEGORIES = ["인건비", "장비", "장소", "식비", "교통", "의상/소품", "후반작업", "기타"];

function formatKRW(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return `${n.toLocaleString()}`;
}

export function BudgetClient({
  projectId,
  initialLines,
}: {
  projectId: string;
  initialLines: BudgetLine[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState(initialLines);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingExpenseFor, setAddingExpenseFor] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
  const [form, setForm] = useState({
    category: "기타",
    description: "",
    estimatedAmount: "",
    actualAmount: "",
    phase: "PRE_PRODUCTION" as Phase,
  });
  const [editForm, setEditForm] = useState({ ...form });

  const apiBase = `/api/projects/${projectId}/budget`;

  const totalEstimated = lines.reduce((s, l) => s + l.estimatedAmount, 0);
  const totalActual = lines.reduce((s, l) => s + getLineActual(l), 0);
  const usagePercent = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;

  // Group by category
  const categories = [...new Set(lines.map((l) => l.category))].sort();

  async function addLine() {
    if (!form.description.trim() || !form.estimatedAmount) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        estimatedAmount: Number(form.estimatedAmount),
        actualAmount: Number(form.actualAmount) || 0,
      }),
    });
    if (res.ok) {
      const l = await res.json();
      setLines((prev) => [...prev, l].sort((a, b) => a.category.localeCompare(b.category)));
      setForm({ category: "기타", description: "", estimatedAmount: "", actualAmount: "", phase: "PRE_PRODUCTION" });
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function saveLine(id: string) {
    setSaving(true);
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        estimatedAmount: Number(editForm.estimatedAmount),
        actualAmount: Number(editForm.actualAmount) || 0,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLines((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setEditingId(null);
      router.refresh();
    }
    setSaving(false);
  }

  async function deleteLine(id: string) {
    if (!confirm("이 예산 항목을 삭제하시겠습니까?")) return;
    await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setLines((prev) => prev.filter((l) => l.id !== id));
    router.refresh();
  }

  async function addExpense(lineId: string) {
    if (!expenseForm.amount || !expenseForm.date) return;
    setSaving(true);
    const res = await fetch(`${apiBase}/${lineId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(expenseForm.amount),
        note: expenseForm.note || null,
        date: expenseForm.date,
      }),
    });
    if (res.ok) {
      const expense = await res.json();
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId
            ? { ...l, expenses: [expense, ...(l.expenses ?? [])] }
            : l
        )
      );
      setExpenseForm({ amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
      setAddingExpenseFor(null);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {lines.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">총 예산</span>
            <span className="font-semibold text-gray-900">{formatKRW(totalEstimated)}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">집행액</span>
            <span className={`font-semibold ${usagePercent > 100 ? "text-red-600" : "text-gray-900"}`}>
              {formatKRW(totalActual)}원
            </span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>집행률</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePercent > 100 ? "bg-red-500" : usagePercent > 80 ? "bg-amber-500" : "bg-green-500"}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {lines.length === 0 && !adding && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">예산 항목이 없습니다</p>
        </div>
      )}

      {/* Lines by category */}
      {categories.map((cat) => {
        const catLines = lines.filter((l) => l.category === cat);
        const catEstimated = catLines.reduce((s, l) => s + l.estimatedAmount, 0);
        const catActual = catLines.reduce((s, l) => s + getLineActual(l), 0);
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</h3>
              <span className="text-xs text-gray-500">
                {formatKRW(catActual)} / {formatKRW(catEstimated)}원
              </span>
            </div>
            <div className="space-y-1">
              {catLines.map((line) => (
                <div key={line.id} className="border border-gray-200 rounded-lg px-4 py-2.5">
                  {editingId === line.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-800">
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={editForm.phase} onChange={(e) => setEditForm((f) => ({ ...f, phase: e.target.value as Phase }))}
                          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-800">
                          {Object.entries(PHASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                        placeholder="항목명 *" />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">예산액 (원)</label>
                          <input type="number" value={editForm.estimatedAmount} onChange={(e) => setEditForm((f) => ({ ...f, estimatedAmount: e.target.value }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">집행액 (원)</label>
                          <input type="number" value={editForm.actualAmount} onChange={(e) => setEditForm((f) => ({ ...f, actualAmount: e.target.value }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveLine(line.id)} disabled={saving}
                          className="rounded bg-primary-800 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">저장</button>
                        <button onClick={() => setEditingId(null)}
                          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600">취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900">{line.description}</p>
                          <p className="text-xs text-gray-400">{PHASE_LABELS[line.phase]}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{formatKRW(line.estimatedAmount)}원</p>
                            {getLineActual(line) > 0 && (
                              <p className={`text-xs ${getLineActual(line) > line.estimatedAmount ? "text-red-500" : "text-green-600"}`}>
                                집행 {formatKRW(getLineActual(line))}원
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setAddingExpenseFor(addingExpenseFor === line.id ? null : line.id)}
                              className="text-xs text-green-600 hover:text-green-800">+ 지출</button>
                            <button
                              onClick={() => {
                                setEditingId(line.id);
                                setEditForm({
                                  category: line.category,
                                  description: line.description,
                                  estimatedAmount: String(line.estimatedAmount),
                                  actualAmount: String(line.actualAmount),
                                  phase: line.phase,
                                });
                              }}
                              className="text-xs text-gray-400 hover:text-gray-600">수정</button>
                            <button onClick={() => deleteLine(line.id)}
                              className="text-xs text-red-400 hover:text-red-600">삭제</button>
                          </div>
                        </div>
                      </div>

                      {/* Expense list */}
                      {line.expenses && line.expenses.length > 0 && (
                        <div className="border-t border-gray-100 pt-2 space-y-1">
                          {line.expenses.map((e) => (
                            <div key={e.id} className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="flex-1">{e.note || "—"}</span>
                              <span>{new Date(e.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
                              <span className="font-medium text-gray-700">{formatKRW(e.amount)}원</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick add expense form */}
                      {addingExpenseFor === line.id && (
                        <div className="border-t border-gray-100 pt-2 space-y-2">
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              type="number"
                              placeholder="금액 (원) *"
                              value={expenseForm.amount}
                              onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <input
                              type="date"
                              value={expenseForm.date}
                              onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                              className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                          <input
                            placeholder="메모 (선택)"
                            value={expenseForm.note}
                            onChange={(e) => setExpenseForm((f) => ({ ...f, note: e.target.value }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => addExpense(line.id)}
                              disabled={saving || !expenseForm.amount}
                              className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              추가
                            </button>
                            <button
                              onClick={() => setAddingExpenseFor(null)}
                              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {adding ? (
        <div className="border border-primary-200 rounded-lg p-4 space-y-3 bg-primary-50">
          <div className="flex gap-2">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.phase} onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value as Phase }))}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800">
              {Object.entries(PHASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <input autoFocus value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
            placeholder="항목명 (예: 카메라 렌탈) *" />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">예산액 (원) *</label>
              <input type="number" value={form.estimatedAmount} onChange={(e) => setForm((f) => ({ ...f, estimatedAmount: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="0" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">집행액 (원)</label>
              <input type="number" value={form.actualAmount} onChange={(e) => setForm((f) => ({ ...f, actualAmount: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-800"
                placeholder="0" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addLine} disabled={saving || !form.description.trim() || !form.estimatedAmount}
              className="rounded bg-primary-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">추가</button>
            <button onClick={() => { setAdding(false); setForm({ category: "기타", description: "", estimatedAmount: "", actualAmount: "", phase: "PRE_PRODUCTION" }); }}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          + 예산 항목 추가
        </button>
      )}
    </div>
  );
}
