/**
 * E2E: 라이브뷰 SSE 실시간 업데이트
 *
 * Scenario:
 *   1. Open the live view page for a shooting day
 *   2. Verify the page loads with scene status list (status: 대기)
 *   3. PUT scene status via API (WAITING → SHOOTING)
 *   4. Verify the live view updates via SSE without page reload (badge shows 콜중)
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

function loadFixtures() {
  const fixtureFile = path.join(process.cwd(), "e2e", ".fixtures", "ids.json");
  return JSON.parse(fs.readFileSync(fixtureFile, "utf-8")) as {
    projectId: string;
    scheduleId: string;
    shootingDayId: string;
    sceneStatusId: string;
  };
}

test("씬 상태 변경 시 라이브뷰가 SSE로 실시간 업데이트된다", async ({ page, request }) => {
  const { projectId, scheduleId, shootingDayId, sceneStatusId } = loadFixtures();
  const liveUrl = `/projects/${projectId}/schedule/${scheduleId}/day/${shootingDayId}/live`;

  // Open the live view page (public — no auth required)
  await page.goto(liveUrl);

  // Wait for the page to load — should show the scene location name
  await expect(page.locator("text=E2E 테스트 장소")).toBeVisible({ timeout: 10_000 });

  // Verify initial status badge is 대기 (using the span status badge, not the button)
  const statusBadge = page.locator("span").filter({ hasText: /^대기$/ }).first();
  await expect(statusBadge).toBeVisible();

  // Trigger a status change via API
  const res = await request.put(`/api/scene-statuses/${sceneStatusId}`, {
    data: { status: "SHOOTING" },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.ok()).toBeTruthy();

  // The live view should update via SSE — status badge should change to 콜중
  const updatedBadge = page.locator("span").filter({ hasText: /^콜중$/ }).first();
  await expect(updatedBadge).toBeVisible({ timeout: 10_000 });

  // Reset back to WAITING for test idempotency
  await request.put(`/api/scene-statuses/${sceneStatusId}`, {
    data: { status: "WAITING" },
    headers: { "Content-Type": "application/json" },
  });
});

test("라이브뷰 SSE 연결이 수립된다", async ({ page }) => {
  const { projectId, scheduleId, shootingDayId } = loadFixtures();
  const liveUrl = `/projects/${projectId}/schedule/${scheduleId}/day/${shootingDayId}/live`;

  // Track SSE connection responses
  const sseResponses: string[] = [];
  page.on("response", (response) => {
    if (
      response.url().includes("/events") &&
      response.headers()["content-type"]?.includes("text/event-stream")
    ) {
      sseResponses.push(response.url());
    }
  });

  await page.goto(liveUrl);
  await expect(page.locator("text=E2E 테스트 장소")).toBeVisible({ timeout: 10_000 });

  // Wait for SSE response to arrive
  await page.waitForResponse(
    (response) =>
      response.url().includes("/events") &&
      (response.headers()["content-type"]?.includes("text/event-stream") ?? false),
    { timeout: 10_000 }
  );

  // SSE connection was established
  expect(sseResponses.length).toBeGreaterThan(0);
});
