/**
 * Budget helpers shared between the budget page and PD dashboard.
 *
 * Rule: if a BudgetLine has Expense records, use SUM(Expense.amount).
 * Otherwise, fall back to the legacy BudgetLine.actualAmount column.
 */

export type BudgetLineWithExpenses = {
  actualAmount: number;
  expenses?: { amount: number }[] | { _sum: { amount: number | null } };
};

/**
 * Returns the actual spend for a budget line.
 * Handles both raw expense arrays (budget page) and aggregated sums (dashboard).
 */
export function getActualAmount(line: BudgetLineWithExpenses): number {
  const expenses = line.expenses;

  if (!expenses) return line.actualAmount;

  // Array form: expenses is Expense[]
  if (Array.isArray(expenses)) {
    if (expenses.length === 0) return line.actualAmount;
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  // Aggregated form: { _sum: { amount: number | null } }
  if ("_sum" in expenses) {
    const sum = expenses._sum.amount;
    if (sum === null || sum === undefined) return line.actualAmount;
    return sum;
  }

  return line.actualAmount;
}

/**
 * Format Korean Won amounts in human-readable form.
 * 150,000,000 → "1.5억", 50,000 → "5만", 1,500 → "1,500"
 */
export function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return `${n.toLocaleString()}`;
}
