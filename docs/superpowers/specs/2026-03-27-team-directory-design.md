# 팀 디렉토리 설계

**날짜:** 2026-03-27
**프로젝트:** nunionda
**범위:** 프로젝트별 팀원 연락처 목록 + 인라인 편집 + PDF/Excel 내보내기

---

## 목표

현재 카카오톡 단체방에 흩어진 스태프 연락처를 시스템에서 관리한다.
부서별 연락망을 PDF/Excel로 내보내 현장 배포 가능하게 한다.

## 범위 제한

- **포함:** 시스템 계정 보유자(User)만 표시. 전화번호 인라인 편집. PDF/Excel 내보내기.
- **제외:** 비계정 외부 스태프 추가 (별도 CrewMember 모델 불필요).

---

## 스키마 변경

```prisma
model User {
  // 기존 필드 유지
  phone String?  // ← 추가: 전화번호 (선택)
}
```

Prisma 마이그레이션 1개 (`add_user_phone`).

---

## 파일 구조

```
prisma/
  migrations/.../add_user_phone/migration.sql

src/app/(dashboard)/projects/[id]/team/
  page.tsx                       ← 서버 컴포넌트: 팀원 조회
  team-directory-client.tsx      ← 클라이언트: 인라인 편집 UI

src/components/
  team-directory-pdf.tsx         ← react-pdf 컴포넌트

src/app/api/
  projects/[id]/team/export/
    route.ts                     ← GET ?format=pdf|excel
  users/[userId]/
    route.ts                     ← PATCH { phone }
```

---

## 데이터 흐름

```
page.tsx
  db.projectMember.findMany({ where: { projectId }, include: { user: true } })
  → MemberRole 기준 그룹핑 (서버 사이드)
  → TeamDirectoryClient로 전달

TeamDirectoryClient
  전화번호 편집 → PATCH /api/users/[userId] → { phone }
  PDF 내보내기 → GET /api/projects/[id]/team/export?format=pdf
  Excel 내보내기 → GET /api/projects/[id]/team/export?format=excel

export route.ts
  format=pdf  → BlobResponse (react-pdf renderToStream)
  format=excel → BlobResponse (ExcelJS workbook.xlsx.writeBuffer)
```

---

## UI 명세

### 팀 디렉토리 페이지 (`/projects/[id]/team`)

```
[← 프로젝트명]                     [PDF 내보내기] [Excel 내보내기]

팀 디렉토리

─── PD/연출 ──────────────────────────────────────────────────
김철수   pd@example.com   010-1234-5678   [✎]

─── 조감독 ──────────────────────────────────────────────────
이영희   ad@example.com   (미등록)        [✎ 등록]

─── 촬영감독 ────────────────────────────────────────────────
박민준   dop@example.com  010-5555-1234   [✎]
```

- 빈 상태: "팀원이 없습니다. 설정 > 팀 관리에서 초대하세요."
- 전화번호 미등록: "(미등록)" 텍스트 + [✎ 등록] 버튼
- 편집 모드: input[type=tel] + [저장] [취소] 인라인

### 인라인 편집 UX

1. [✎] 클릭 → 해당 행에 `input[type=tel]` 표시, 기존 값 pre-fill
2. [저장] → `PATCH /api/users/[userId]` → 성공 시 낙관적 업데이트
3. [취소] → 편집 취소
4. 에러 시 인라인 토스트 ("저장 실패")

---

## API 명세

### `PATCH /api/users/[userId]`
```json
Request:  { "phone": "010-1234-5678" }
Response: { "id": "...", "phone": "010-1234-5678" }
```
- 본인만 수정 가능 (`session.user.id === userId`)

### `GET /api/projects/[id]/team/export?format=pdf`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="team-[projectTitle]-[date].pdf"`

### `GET /api/projects/[id]/team/export?format=excel`
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="team-[projectTitle]-[date].xlsx"`

---

## PDF 포맷 (`team-directory-pdf.tsx`)

- 폰트: NotoSansKR (call-sheet-pdf.tsx와 동일 패턴)
- 헤더: `[작품명] 팀 연락망 | [날짜]`
- 부서별 섹션: 섹션 헤더(파란 줄) + 멤버 행 반복
- 컬럼: 이름 · 역할 · 전화번호 · 이메일

## Excel 포맷 (`exceljs`)

- 시트명: "팀 연락망"
- 컬럼: 부서, 이름, 전화번호, 이메일
- 헤더 행: 굵게, 파란 배경
- 부서별 그룹: 동일 부서는 셀 배경색으로 구분

---

## 네비게이션 추가

`/projects/[id]/page.tsx` (프로젝트 상세)에 "팀 디렉토리" 링크 추가.
현재 프로젝트 레이아웃에 별도 탭바가 없으므로 페이지 내 카드/버튼으로 진입.

---

## 테스트

- unit: `groupByRole()` 헬퍼 (MemberRole → 멤버 배열 그룹핑)
- E2E: 추가하지 않음 (기존 E2E 커버리지 내 비중 낮음)
