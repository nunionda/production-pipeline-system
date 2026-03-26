/**
 * E2E fixture teardown script — run via Bun (not directly by Playwright).
 * Removes the schedule created in seed-fixtures.ts (cascades to all children).
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const fixtureFile = path.join(process.cwd(), "e2e", ".fixtures", "ids.json");
if (!fs.existsSync(fixtureFile)) {
  console.log("No fixture file found — skipping teardown");
  process.exit(0);
}

const fixtures = JSON.parse(fs.readFileSync(fixtureFile, "utf-8"));

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// Deleting the schedule cascades to:
//   ShootingDay → CallSheet → CallSheetShare → CallSheetConfirmation
//   ShootingDay → SceneStatus
await db.schedule.delete({ where: { id: fixtures.scheduleId } }).catch(() => {});

await db.$disconnect();

fs.unlinkSync(fixtureFile);
console.log("✓ E2E fixtures cleaned up");
