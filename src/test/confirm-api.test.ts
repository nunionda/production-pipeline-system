/**
 * Unit tests for the confirm API logic.
 * Tests the validation rules and edge cases without hitting the DB.
 */

import { describe, it, expect } from "vitest";

// Pure validation logic extracted from the confirm route
function validateConfirmRequest(
  share: { expiresAt: Date } | null,
  actorName: string | undefined
): { ok: true } | { ok: false; status: number; error: string } {
  if (!share) return { ok: false, status: 404, error: "링크를 찾을 수 없습니다" };
  if (share.expiresAt < new Date()) return { ok: false, status: 410, error: "링크가 만료되었습니다" };
  if (!actorName || actorName.trim().length === 0) {
    return { ok: false, status: 400, error: "배우 이름이 필요합니다" };
  }
  return { ok: true };
}

describe("confirm API validation", () => {
  it("returns 404 when share is null (token not found)", () => {
    const result = validateConfirmRequest(null, "김민준");
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("returns 410 when share is expired", () => {
    const yesterday = new Date(Date.now() - 86400_000);
    const result = validateConfirmRequest({ expiresAt: yesterday }, "김민준");
    expect(result).toMatchObject({ ok: false, status: 410 });
  });

  it("returns 400 when actorName is empty string", () => {
    const tomorrow = new Date(Date.now() + 86400_000);
    const result = validateConfirmRequest({ expiresAt: tomorrow }, "");
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("returns 400 when actorName is whitespace only", () => {
    const tomorrow = new Date(Date.now() + 86400_000);
    const result = validateConfirmRequest({ expiresAt: tomorrow }, "   ");
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("returns ok for valid share and actorName", () => {
    const tomorrow = new Date(Date.now() + 86400_000);
    const result = validateConfirmRequest({ expiresAt: tomorrow }, "이수진");
    expect(result).toEqual({ ok: true });
  });
});
