import { describe, it, expect } from "vitest";
import { getActualAmount } from "@/lib/budget";

describe("getActualAmount", () => {
  it("returns actualAmount when no expenses", () => {
    const line = { actualAmount: 5000, expenses: [] };
    expect(getActualAmount(line)).toBe(5000);
  });

  it("returns sum of expenses when expenses exist", () => {
    const line = {
      actualAmount: 5000,
      expenses: [{ amount: 3000 }, { amount: 2500 }],
    };
    expect(getActualAmount(line)).toBe(5500);
  });

  it("falls back to actualAmount when expenses is undefined", () => {
    const line = { actualAmount: 12000 };
    expect(getActualAmount(line)).toBe(12000);
  });

  it("handles aggregated _sum form (dashboard query)", () => {
    const line = {
      actualAmount: 5000,
      expenses: { _sum: { amount: 8800 } },
    };
    expect(getActualAmount(line)).toBe(8800);
  });

  it("falls back to actualAmount when _sum is null", () => {
    const line = {
      actualAmount: 5000,
      expenses: { _sum: { amount: null } },
    };
    expect(getActualAmount(line)).toBe(5000);
  });
});
