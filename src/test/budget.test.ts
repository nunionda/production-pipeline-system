import { describe, it, expect } from "vitest";
import { getActualAmount, formatKRW } from "@/lib/budget";

describe("formatKRW", () => {
  it("formats amounts >= 1억 in 억 units", () => {
    expect(formatKRW(150_000_000)).toBe("1.5억");
    expect(formatKRW(100_000_000)).toBe("1.0억");
    expect(formatKRW(320_000_000)).toBe("3.2억");
  });

  it("formats amounts >= 1만 in 만 units", () => {
    expect(formatKRW(50_000)).toBe("5만");
    expect(formatKRW(10_000)).toBe("1만");
    expect(formatKRW(250_000)).toBe("25만");
  });

  it("formats small amounts with locale string", () => {
    expect(formatKRW(1_500)).toBe("1,500");
    expect(formatKRW(0)).toBe("0");
    expect(formatKRW(9_999)).toBe("9,999");
  });
});

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
