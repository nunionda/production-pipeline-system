# Archived Postgres Migrations

이 폴더는 SQLite 마이그레이션 전(Postgres 시절)의 Prisma migration history를 보존한 것이다.

## 왜 보존하는가
- Postgres로 운영하던 기존 데이터/배포가 있을 경우 reference로 필요
- DB 스키마 진화 이력 (Sprint 1~8) 추적 가능

## 왜 사용하지 않는가
- SQLite는 Postgres의 SQL 문법과 100% 호환되지 않음 (`gen_random_uuid()`, JSON 연산자 등)
- 기존 migration의 `CREATE TABLE` SQL은 SQLite에서 실행 불가
- 새 환경은 `bunx prisma db push`로 schema에서 직접 SQLite DDL 생성

## Postgres로 다시 돌아갈 때
1. `prisma/schema.prisma` 의 provider를 `postgresql`로 복원
2. `src/lib/db.ts` 와 `prisma/seed.ts` 에서 `PrismaPg` adapter 복원
3. `package.json`의 deps에 `pg`, `@prisma/adapter-pg` 복원
4. 이 폴더를 `prisma/migrations`로 rename
