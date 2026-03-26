/**
 * Playwright global teardown — removes test fixtures from the database by delegating
 * to a Bun script.
 */

import { execSync } from "child_process";
import * as path from "path";

async function globalTeardown() {
  const scriptPath = path.join(process.cwd(), "e2e", "teardown-fixtures.ts");
  execSync(`bun "${scriptPath}"`, {
    stdio: "inherit",
    env: process.env,
  });
}

export default globalTeardown;
