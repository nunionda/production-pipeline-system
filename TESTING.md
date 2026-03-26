# Testing — nunionda

> 100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

- **Unit/Component:** [Vitest](https://vitest.dev/) v4 + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
- **E2E:** (planned — Playwright)

## Run Tests

```bash
bun run test          # run all tests once
bun run test:watch    # watch mode
```

## Test Layers

| Layer | What | Where | When |
|-------|------|-------|------|
| Unit | Pure functions, utilities | `src/test/*.test.ts` | Every commit |
| Component | React components in isolation | `src/test/*.test.tsx` | Every UI change |
| Integration | API routes + DB (planned) | `src/test/*.integration.test.ts` | Before merge |
| E2E | Full user flows in browser (planned) | `e2e/` | Before release |

## Conventions

- Test files: `src/test/{name}.test.{ts,tsx}`
- Regression tests: `src/test/{name}.regression-{N}.test.{ts,tsx}`
- Imports: `import { describe, it, expect } from "vitest"`
- DOM tests: `import { render, screen } from "@testing-library/react"`
- Path alias: `@/` maps to `src/`

## Test Expectations

- When writing new functions → write a corresponding test
- When fixing a bug → write a regression test (see `/qa` skill)
- When adding error handling → write a test that triggers the error
- When adding a conditional → test both paths
- Never commit code that makes existing tests fail
