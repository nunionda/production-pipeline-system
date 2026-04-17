# Legacy Docker Setup (Postgres)

이 폴더의 `Dockerfile`과 `docker-compose.yml`은 SQLite 마이그레이션 이전(Postgres 시절)의
배포 구성이다. 현재 권장 운영 방식은 **로컬 SQLite 직접 실행**이다.

```bash
# 권장 방식 (외부 의존성 0)
cp .env.example .env
bun install
bun run db:setup
bun run dev
```

## Docker로 돌아갈 때

1. 이 폴더의 두 파일을 프로젝트 루트로 이동
2. `docker-compose.yml` 의 `db` 서비스 제거 (또는 SQLite 마이그레이션을 Postgres로 reverse)
3. `prisma/schema.prisma` provider를 `postgresql`로 복원 (`prisma/migrations.postgres-archive/README.md` 참고)
4. `app` 서비스의 `DATABASE_URL`을 환경에 맞게 수정

또는 SQLite 그대로 컨테이너화하려면:
- `db` 서비스 통째로 제거
- `app` 서비스의 `DATABASE_URL=file:/data/dev.db` 로 변경
- volume `uploads` 와 별도로 `db-data:/data` mount 추가
