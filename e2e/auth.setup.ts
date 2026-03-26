/**
 * Playwright auth setup — logs in as AD user and saves browser storage state.
 * Runs in the "setup" project before all E2E tests.
 */

import { test as setup } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_FILE = path.join(process.cwd(), "e2e", ".auth", "ad-user.json");

setup("authenticate as AD user", async ({ page }) => {
  // Ensure auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto("/login");

  // Korean login form labels
  await page.getByLabel("이메일").fill("ad@nunionda.com");
  await page.getByLabel("비밀번호").fill("ad1234");
  await page.getByRole("button", { name: "로그인" }).click();

  // Wait for redirect to dashboard after successful login
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  // Save the authenticated browser state
  await page.context().storageState({ path: AUTH_FILE });
});
