/**
 * E2E fixture seed script — run via Bun (not directly by Playwright).
 * Called from global-setup.ts via execSync("bun e2e/seed-fixtures.ts").
 *
 * Writes fixture IDs to e2e/.fixtures/ids.json for test files to consume.
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const db = new PrismaClient({ adapter });

const PROJECT_ID = "sample-project-1";

// Get or create script for the project
let script = await db.script.findFirst({ where: { projectId: PROJECT_ID } });
if (!script) {
  script = await db.script.create({
    data: { projectId: PROJECT_ID, title: "E2E 테스트 시나리오" },
  });
}

// Scene number 999 — high enough to avoid conflicts with real data
const existingScene = await db.scene.findUnique({
  where: { scriptId_number: { scriptId: script.id, number: 999 } },
});
const scene =
  existingScene ??
  (await db.scene.create({
    data: {
      scriptId: script.id,
      number: 999,
      intExt: "INT",
      location: "E2E 테스트 장소",
      timeOfDay: "D",
    },
  }));

// Create a fresh schedule + shooting day for each test run
const schedule = await db.schedule.create({
  data: { projectId: PROJECT_ID, title: "E2E 테스트 스케줄" },
});

// Shooting day 30 days in the future — share token won't expire during tests
const shootDate = new Date();
shootDate.setDate(shootDate.getDate() + 30);
shootDate.setHours(0, 0, 0, 0);

const shootingDay = await db.shootingDay.create({
  data: {
    scheduleId: schedule.id,
    date: shootDate,
    location: "E2E 테스트 로케이션",
    callTime: "08:00",
  },
});

// Scene status — WAITING so live view tests can toggle it
const sceneStatus = await db.sceneStatus.create({
  data: {
    sceneId: scene.id,
    shootingDayId: shootingDay.id,
    status: "WAITING",
  },
});

// Call sheet with minimal cast data
const callSheet = await db.callSheet.create({
  data: {
    shootingDayId: shootingDay.id,
    callTime: "08:00",
    scenes: [],
    cast: [{ name: "김테스트", role: "주인공", callTime: "08:00" }],
    crew: [],
    equipment: [],
    meals: [],
  },
});

// Share token — expires well after shooting day
const shareExpiresAt = new Date(shootDate);
shareExpiresAt.setHours(shareExpiresAt.getHours() + 48);

const share = await db.callSheetShare.create({
  data: {
    callSheetId: callSheet.id,
    shootingDayId: shootingDay.id,
    expiresAt: shareExpiresAt,
  },
});

const fixtures = {
  projectId: PROJECT_ID,
  scheduleId: schedule.id,
  shootingDayId: shootingDay.id,
  sceneStatusId: sceneStatus.id,
  callSheetId: callSheet.id,
  shareToken: share.token,
  sceneId: scene.id,
  scriptId: script.id,
};

const fixtureDir = path.join(process.cwd(), "e2e", ".fixtures");
fs.mkdirSync(fixtureDir, { recursive: true });
fs.writeFileSync(path.join(fixtureDir, "ids.json"), JSON.stringify(fixtures, null, 2));

await db.$disconnect();

console.log("✓ E2E fixtures seeded:", JSON.stringify(fixtures, null, 2));
