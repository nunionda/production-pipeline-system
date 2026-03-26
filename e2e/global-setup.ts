/**
 * Playwright global setup — creates test fixtures in the database by delegating
 * to a Bun script (seed-fixtures.ts) which can import Prisma with full @/ alias support.
 */

import { execSync } from "child_process";
import * as path from "path";

async function globalSetup() {
  const scriptPath = path.join(process.cwd(), "e2e", "seed-fixtures.ts");
  execSync(`bun "${scriptPath}"`, {
    stdio: "inherit",
    env: process.env,
  });
}

export default globalSetup;
