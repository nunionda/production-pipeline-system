/**
 * E2E: 콜시트 공유 → 배우 확인 플로우
 *
 * Scenario:
 *   1. Public user opens /c/[token] in a fresh browser context (no auth)
 *   2. Enters actor name and clicks confirm
 *   3. Verify "확인 완료" message appears
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
    shareToken: string;
    callSheetId: string;
  };
}

test("공개 콜시트 링크에서 배우가 이름을 입력하고 확인한다", async ({ browser }) => {
  const { shareToken } = loadFixtures();

  // Open a fresh context (no auth) — simulates a cast member receiving the link
  const publicContext = await browser.newContext({ storageState: undefined });
  const publicPage = await publicContext.newPage();

  // Navigate to the public call sheet page
  await publicPage.goto(`/c/${shareToken}`);

  // Wait for the page to load — header paragraph "콜시트" (exact, in the blue header)
  await expect(publicPage.getByText("콜시트", { exact: true })).toBeVisible({ timeout: 10_000 });

  // The confirm section heading should be visible
  await expect(publicPage.getByRole("heading", { name: "콜시트 확인" })).toBeVisible();

  // Enter actor name
  const nameInput = publicPage.getByPlaceholder("이름 입력 (예: 김민준)");
  await nameInput.fill("김이화");

  // Click confirm button
  await publicPage.getByRole("button", { name: "콜시트 확인했습니다" }).click();

  // Verify confirmation success message
  await expect(publicPage.locator("text=확인 완료")).toBeVisible({ timeout: 8_000 });
  await expect(publicPage.locator("text=김이화")).toBeVisible();

  await publicContext.close();
});

test("배우 이름 없이 확인 버튼을 누르면 제출되지 않는다", async ({ browser }) => {
  const { shareToken } = loadFixtures();

  const publicContext = await browser.newContext({ storageState: undefined });
  const publicPage = await publicContext.newPage();

  await publicPage.goto(`/c/${shareToken}`);
  await expect(publicPage.getByText("콜시트", { exact: true })).toBeVisible({ timeout: 10_000 });

  // Button should be disabled when name is empty
  const confirmButton = publicPage.getByRole("button", { name: "콜시트 확인했습니다" });
  await expect(confirmButton).toBeDisabled();

  await publicContext.close();
});

test("존재하지 않는 토큰으로 접근하면 에러 메시지를 보여준다", async ({ browser }) => {
  const publicContext = await browser.newContext({ storageState: undefined });
  const publicPage = await publicContext.newPage();

  // Use a non-existent token
  await publicPage.goto("/c/00000000-0000-0000-0000-000000000000");

  // Should show specific error about link not found
  await expect(publicPage.locator("text=링크를 찾을 수 없습니다")).toBeVisible({ timeout: 10_000 });

  await publicContext.close();
});
