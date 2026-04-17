# 누니온다 — 영상 제작 프로덕션 파이프라인 관리 시스템

## Commands

```bash
bun install              # 의존성 설치
bun run dev              # 개발 서버 (Next.js)
bun run build            # 프로덕션 빌드
bun run lint             # ESLint

# Database
bun run db:generate      # Prisma 클라이언트 생성
bun run db:push          # 스키마를 DB에 밀어넣기 (마이그레이션 없이)
bun run db:migrate       # 마이그레이션 생성 및 적용
bun run db:seed          # 시드 데이터 삽입
bun run db:studio        # Prisma Studio (DB GUI)
bun run db:reset         # DB 리셋 + 마이그레이션 재적용
```

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19
- **UI:** Tailwind CSS 4 + Pretendard 폰트
- **ORM:** Prisma 7 + @prisma/adapter-better-sqlite3
- **DB:** SQLite (로컬 개발: `./dev.db` — local-first, 외부 서버 불필요)
- **Auth:** NextAuth.js v5 (beta) — Credentials provider
- **Language:** TypeScript, 전체 UI 한국어

## Local-first 정책

이 앱은 외부 서버 의존성이 없도록 설계됐다. SQLite 단일 파일 DB를 사용하므로
`bun install && bun run db:setup && bun run dev` 만으로 전체 시스템 가동.

이전 Postgres + Docker 구성은 `docker.legacy/`에 보존되어 있다.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # 사이드바 레이아웃 적용 라우트
│   │   ├── dashboard/      # 메인 대시보드
│   │   ├── projects/       # 프로젝트 목록 + CRUD
│   │   │   ├── new/        # 프로젝트 생성
│   │   │   └── [id]/       # 프로젝트 상세
│   │   │       ├── script/     # 시나리오 (Sprint 1)
│   │   │       ├── schedule/   # 스케줄 (Sprint 2)
│   │   │       ├── production/ # 촬영 (Sprint 3)
│   │   │       ├── post/       # 포스트 (Sprint 5)
│   │   │       └── delivery/   # 납품 (Sprint 6)
│   │   └── settings/       # 설정
│   ├── api/
│   │   ├── auth/           # NextAuth + 회원가입
│   │   └── projects/       # 프로젝트 API
│   └── login/              # 로그인 페이지
├── components/
│   ├── sidebar.tsx          # 왼쪽 사이드바
│   ├── phase-tabs.tsx       # 상단 단계 탭
│   └── status-badge.tsx     # 상태 뱃지 (● ○ ▲ ✕)
├── lib/
│   ├── db.ts               # Prisma 클라이언트
│   └── auth.ts             # NextAuth 설정
└── generated/prisma/        # Prisma 생성 (gitignored)

prisma/
├── schema.prisma           # 데이터 모델
├── seed.ts                 # 시드 스크립트
└── migrations/             # 마이그레이션 파일
```

## Design Tokens

- **Primary:** #1E40AF (Blue 800)
- **폰트:** Pretendard Variable (한국어 최적화)
- **상태 색상:** Green(완료), Blue(활성), Gray(대기), Amber(경고), Red(차단)
- **Density:** Desktop compact(36px), Mobile relaxed(48px)

## Prisma 7 주의사항

- `datasource` URL은 `prisma.config.ts`에서 설정 (schema.prisma에 url 없음)
- PrismaClient는 `@prisma/adapter-better-sqlite3`의 `PrismaBetterSqlite3` 어댑터 사용
  - 클래스명 카멜케이스 주의: `Sqlite` (not `SQLite`)
- Import: `from "@/generated/prisma/client"` (not `@/generated/prisma`)
- 시드 스크립트에서 `import "dotenv/config"` 필수
- **`prisma/seed.ts` 는 Bun이 아닌 Node + tsx로 실행** (`better-sqlite3` 가 Bun 런타임에서 미지원).
  `db:seed` 스크립트가 `bunx tsx` 사용

## 로그인 정보 (개발용)

- 관리자: admin@nunionda.com / admin1234
- PD: pd@nunionda.com / pd1234
- 조감독: ad@nunionda.com / ad1234
