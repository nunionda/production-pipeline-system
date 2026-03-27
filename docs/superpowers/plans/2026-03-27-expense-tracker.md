# Sprint 8d — 비용 실행 트래커 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the dashboard budget bar to use real Expense data (via `getActualAmount`) instead of the legacy `actualAmount` field, completing Sprint 8d.

**Architecture:** The `Expense` model, budget API, budget detail page, and `getActualAmount()` helper are already fully built. The one remaining gap: `src/app/(dashboard)/dashboard/page.tsx` queries `budgetLine` with only `{ estimatedAmount, actualAmount }` — it does not include `expenses`, so the dashboard budget bar shows stale `actualAmount` instead of the sum of `Expense` records. Fix: include `expenses: { select: { amount: true } }` in the query, then use `getActualAmount()` to compute the actual spend.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma, Vitest

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/app/(dashboard)/dashboard/page.tsx` | Modify | Include `expenses` in budget query, use `getActualAmount()` |
| `src/test/budget.test.ts` | Verify | Already covers `getActualAmount` — confirm no new tests needed |

---

## Task 1: Fix dashboard budget bar to use Expense SUM

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Read `src/app/(dashboard)/dashboard/page.tsx`**

  Find the budget query at approximately line 30:
  ```typescript
  db.budgetLine.findMany({
    where: { projectId: p.id },
    select: { estimatedAmount: true, actualAmount: true },
  }),
  ```

- [ ] **Step 2: Add `getActualAmount` import**

  At the top of the file, add:
  ```typescript
  import { getActualAmount } from "@/lib/budget";
  ```

- [ ] **Step 3: Update the budget query to include expenses**

  Change:
  ```typescript
  db.budgetLine.findMany({
    where: { projectId: p.id },
    select: { estimatedAmount: true, actualAmount: true },
  }),
  ```

  To:
  ```typescript
  db.budgetLine.findMany({
    where: { projectId: p.id },
    select: {
      estimatedAmount: true,
      actualAmount: true,
      expenses: { select: { amount: true } },
    },
  }),
  ```

- [ ] **Step 4: Update `totalAct` calculation**

  Change:
  ```typescript
  const totalAct = budgetLines.reduce((s, l) => s + l.actualAmount, 0);
  ```

  To:
  ```typescript
  const totalAct = budgetLines.reduce((s, l) => s + getActualAmount(l), 0);
  ```

- [ ] **Step 5: TypeScript check**

  ```bash
  cd /path/to/nunionda && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No new errors. (`getActualAmount` accepts `BudgetLineWithExpenses` which is `{ actualAmount: number; expenses?: ... }` — the query now returns `expenses: { amount: number }[]` which satisfies the array form.)

- [ ] **Step 6: Run tests**

  ```bash
  cd /path/to/nunionda && npx vitest run --reporter=verbose 2>&1 | tail -5
  ```

  Expected: 76 tests pass (no new tests needed — `getActualAmount` is already covered in `budget.test.ts`).

- [ ] **Step 7: Commit**

  ```bash
  git add "src/app/(dashboard)/dashboard/page.tsx"
  git commit -m "fix: dashboard budget bar uses Expense SUM via getActualAmount"
  ```

---

## Self-Review

### Spec Coverage

From CEO plan:
> - PD 대시보드 예산 바: `Expense` SUM으로 집행률 계산
> - `getActualAmount()` 헬퍼 함수: `src/lib/budget.ts`에 추출 — budget 페이지 + PD 대시보드 양쪽에서 사용

| Requirement | Status |
|------------|--------|
| `Expense` 모델 | ✅ Already in schema |
| `getActualAmount()` helper | ✅ Already in `lib/budget.ts` |
| BudgetLine 페이지 지출 추가 폼 | ✅ Already in budget-client.tsx |
| 대시보드 예산 바 Expense SUM 사용 | ✅ Task 1 fixes this |
| 기존 `actualAmount` 컬럼 유지 | ✅ Not touched |

### No Placeholders
Single concrete change. No vague steps.

### Type Consistency
`getActualAmount` signature in `lib/budget.ts`:
```typescript
export type BudgetLineWithExpenses = {
  actualAmount: number;
  expenses?: Expense[] | { _sum: { amount: number | null } } | { amount: number }[];
};
```
The query shape `{ estimatedAmount, actualAmount, expenses: [{ amount }] }` satisfies the array form of `expenses`. TypeScript will be happy.
