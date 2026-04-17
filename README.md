# 누니온다 — 영상 제작 프로덕션 파이프라인 관리 시스템

영화 한 편이 **기획 → 시나리오 → 스케줄 → 촬영 → 포스트 → 납품**까지 가는 전 과정을 한 곳에서 관리하는 백오피스.

## 한눈에

- **6단계 워크플로우**: PRE_PRODUCTION → PRODUCTION → POST → DELIVERY 까지 36개 Prisma 모델로 매핑
- **Local-first**: SQLite 단일 파일 DB. 외부 서버(Postgres/Redis 등) 설치 불필요
- **인증**: NextAuth.js v5 (Credentials provider) — 시드 계정 즉시 로그인 가능
- **스택**: Next.js 16 (App Router) + React 19 + Tailwind 4 + Prisma 7 + better-sqlite3

## 빠른 시작 (3분)

```bash
# 1. 의존성 설치
bun install

# 2. .env 파일 생성
cp .env.example .env

# 3. DB 생성 + 시드 (한 번에)
bun run db:setup

# 4. 개발 서버
bun run dev
# → http://localhost:3000
```

### 시드 계정 (개발용)

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| 관리자 | `admin@nunionda.com` | `admin1234` |
| PD | `pd@nunionda.com` | `pd1234` |
| 조감독 | `ad@nunionda.com` | `ad1234` |

샘플 프로젝트: **비밀의 숲 시즌3** (PRE_PRODUCTION 단계)

## 명령어

```bash
bun run dev              # 개발 서버 (http://localhost:3000)
bun run build            # 프로덕션 빌드
bun run start            # 프로덕션 서버
bun run lint             # ESLint

# Database (SQLite — Prisma 7 + @prisma/adapter-better-sqlite3)
bun run db:setup         # generate + push + seed (최초 1회)
bun run db:generate      # Prisma 클라이언트 생성
bun run db:push          # schema → DB 반영 (마이그레이션 없이)
bun run db:seed          # 시드 데이터 삽입 (Node tsx 사용)
bun run db:studio        # Prisma Studio (http://localhost:5555)
bun run db:reset         # DB 초기화 + 마이그레이션 재적용
bun run db:migrate       # 마이그레이션 생성/적용

# 테스트
bun run test             # Vitest 단위 테스트
bun run test:watch       # Vitest watch 모드
bun run test:e2e         # Playwright E2E
```

## 프로젝트 구조

```
src/
├── app/
│   ├── (public)/projects/[id]/        # 프로젝트 상세 (스크립트/스케줄/포스트/납품)
│   │   └── schedule/[scheduleId]/day/[dayId]/live  # 콜시트 라이브 모드
│   ├── api/
│   │   ├── auth/                      # NextAuth + 회원가입
│   │   └── projects/[id]/             # 16개 엔드포인트 그룹
│   │       ├── budget/, characters/, color-grading/, costumes/
│   │       ├── delivery-targets/, edit-versions/, locations/
│   │       ├── master-files/, props/, qc-reports/
│   │       ├── schedules/, scripts/, sound-tasks/
│   │       ├── team/, vfx-shots/
│   └── login/
├── components/
├── lib/
│   ├── ai-analyzer.ts      # 시나리오 자동 분석 (Gemini, 옵셔널)
│   ├── auth.ts             # NextAuth 설정
│   ├── budget.ts           # 예산 집계
│   ├── db.ts               # Prisma + SQLite 어댑터
│   ├── script-parser.ts
│   ├── sse-emitter.ts      # 실시간 알림
│   └── team.ts
└── generated/prisma/        # Prisma 생성물 (gitignored)

prisma/
├── schema.prisma                # 36개 모델
├── seed.ts                      # 초기 사용자 + 샘플 프로젝트
├── migrations/                  # SQLite 마이그레이션 (db push로 자동 생성)
└── migrations.postgres-archive/ # 구 Postgres 마이그레이션 보존

docker.legacy/                   # 구 Postgres + Docker 구성 (legacy reference)
```

## 데이터 모델 개요 (36개)

**Auth**: User / Session
**프로젝트**: Project / ProjectMember / BudgetLine / Expense
**시나리오**: Script / Scene / Character / Prop / Costume / Location / VFX
**연결**: SceneCharacter / SceneProp / SceneCostume / SceneLocation / SceneVFX
**촬영**: Shot / Schedule / ShootingDay / CallSheet / CallSheetShare / CallSheetConfirmation
**일일 보고**: DailyReport / SceneStatus / FieldChange / DailyAssetLog
**포스트**: EditVersion / VFXShot / SoundTask / ColorGradingSession / QCReport
**납품**: MasterFile / DeliveryTarget
**시스템**: AnalysisJob / AuditLog

## 환경 변수

`.env.example` 참고. 핵심:

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite 파일 경로 |
| `NEXTAUTH_SECRET` | (변경 필수) | NextAuth JWT 서명 키 |
| `NEXTAUTH_URL` | `http://localhost:3000` | 콜백 베이스 URL |
| `GOOGLE_API_KEY` | (옵션) | Gemini Free Tier — 시나리오 자동 분석에만 사용 |

## DB 백업/이동

SQLite 단일 파일이라 백업/이동이 단순:

```bash
# 백업
cp dev.db dev.db.bak.$(date +%Y%m%d)

# 다른 머신으로 이동 (rsync, scp, USB 등)
scp dev.db user@host:/path/to/project/

# 초기화
bun run db:reset
```

## 외부 의존성 (없음)

이 앱은 **외부 서버 의존성이 없다**:
- ✅ DB: SQLite (단일 파일)
- ✅ Auth: NextAuth (JWT 세션, 외부 IdP 불필요)
- ✅ 파일 업로드: 로컬 파일시스템 (`/data/uploads` 또는 설정한 경로)
- ⚠️ AI 분석 기능만 외부 API 사용 (Google Gemini, 옵셔널)

이전 Postgres + Docker 구성은 `docker.legacy/`로 이동했다.
필요 시 그곳의 README 참고.

## Prisma 7 + Bun 주의사항

- `prisma/seed.ts` 는 **Node + tsx로 실행** (`better-sqlite3` 가 Bun 런타임에서 미지원)
- `db:setup`, `db:seed` 스크립트가 자동으로 `bunx tsx` 사용
- Next.js dev 서버는 Node 런타임으로 동작 (런타임 Prisma 호출은 정상)
- Prisma 7은 `prisma.config.ts` 에서 datasource URL 설정

## 디자인 토큰

- **Primary**: `#1E40AF` (Blue 800)
- **폰트**: Pretendard Variable (한국어 최적화)
- **상태 색상**: Green(완료) / Blue(활성) / Gray(대기) / Amber(경고) / Red(차단)
- **Density**: Desktop compact(36px), Mobile relaxed(48px)

## Repository

자체 GitHub 저장소: **https://github.com/nunionda/production-pipeline-system**
marionette-suite 모노레포에서는 git submodule로 통합된다.
