# 팀 디렉토리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트별 팀원 연락처 디렉토리 — 부서별 그룹 뷰, 전화번호 인라인 편집, PDF/Excel 내보내기

**Architecture:** User 모델에 `phone` 필드 추가. `/projects/[id]/team` 페이지는 서버 컴포넌트가 DB 조회 후 클라이언트 컴포넌트로 전달. 내보내기는 단일 export route(`?format=pdf|excel`)가 처리.

**Tech Stack:** Next.js 15 App Router, Prisma 7, @react-pdf/renderer, ExcelJS, NextAuth v5

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `prisma/schema.prisma` | User에 `phone String?` 추가 |
| `src/lib/team.ts` | `groupByRole()` 헬퍼 |
| `src/test/team.test.ts` | `groupByRole()` 유닛 테스트 |
| `src/app/api/users/[userId]/route.ts` | `PATCH { phone }` |
| `src/app/(dashboard)/projects/[id]/team/page.tsx` | 서버 컴포넌트: DB 조회 |
| `src/app/(dashboard)/projects/[id]/team/team-directory-client.tsx` | 클라이언트: 편집 UI |
| `src/components/team-directory-pdf.tsx` | react-pdf 컴포넌트 |
| `src/app/api/projects/[id]/team/export/route.ts` | GET ?format=pdf\|excel |
| `src/app/(dashboard)/projects/[id]/page.tsx` | 팀 디렉토리 링크 추가 |

---

### Task 1: 스키마 — User에 phone 추가

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: schema.prisma에 phone 필드 추가**

`model User` 블록에 한 줄 추가 (hashedPassword 아래):

```prisma
model User {
  id             String    @id @default(cuid())
  name           String
  email          String    @unique
  hashedPassword String
  phone          String?
  role           UserRole  @default(STAFF)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  projects       ProjectMember[]
}
```

- [ ] **Step 2: 마이그레이션 생성 및 적용**

```bash
cd /Users/daniel/dev/antigravity-dev/nunionda
bunx prisma migrate dev --name add_user_phone
```

Expected output: `✔ Your database is now in sync with your schema.`

- [ ] **Step 3: Prisma 클라이언트 재생성 확인**

```bash
bunx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add phone field to User model"
```

---

### Task 2: groupByRole 헬퍼 + 테스트

**Files:**
- Create: `src/lib/team.ts`
- Create: `src/test/team.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/test/team.test.ts
import { describe, it, expect } from "vitest";
import { groupByRole } from "@/lib/team";

const MEMBER_ROLE_LABEL: Record<string, string> = {
  PD: "PD/연출",
  AD: "조감독",
  DOP: "촬영감독",
  STAFF: "일반 스태프",
};

describe("groupByRole", () => {
  it("groups members by role", () => {
    const members = [
      { id: "1", role: "PD", user: { id: "u1", name: "김철수", email: "a@b.com", phone: null } },
      { id: "2", role: "AD", user: { id: "u2", name: "이영희", email: "c@d.com", phone: "010-1234" } },
      { id: "3", role: "PD", user: { id: "u3", name: "박민준", email: "e@f.com", phone: null } },
    ];

    const result = groupByRole(members);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("PD");
    expect(result[0].label).toBe("PD/연출");
    expect(result[0].members).toHaveLength(2);
    expect(result[1].role).toBe("AD");
    expect(result[1].members).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(groupByRole([])).toEqual([]);
  });

  it("preserves member order within group", () => {
    const members = [
      { id: "1", role: "AD", user: { id: "u1", name: "가나다", email: "a@b.com", phone: null } },
      { id: "2", role: "AD", user: { id: "u2", name: "마바사", email: "c@d.com", phone: null } },
    ];
    const result = groupByRole(members);
    expect(result[0].members[0].user.name).toBe("가나다");
    expect(result[0].members[1].user.name).toBe("마바사");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd /Users/daniel/dev/antigravity-dev/nunionda
bun test src/test/team.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/team'`

- [ ] **Step 3: groupByRole 구현**

```typescript
// src/lib/team.ts

export const MEMBER_ROLE_LABEL: Record<string, string> = {
  PD: "PD/연출",
  AD: "조감독",
  WRITER: "작가",
  ART_DIRECTOR: "미술감독",
  DOP: "촬영감독",
  LIGHTING: "조명감독",
  SOUND: "사운드",
  EDITOR: "편집",
  VFX_SUPERVISOR: "VFX 슈퍼바이저",
  PRODUCER: "프로듀서",
  PRODUCTION_MANAGER: "제작부장",
  STAFF: "일반 스태프",
};

// Role display order
const ROLE_ORDER = [
  "PD", "AD", "PRODUCER", "PRODUCTION_MANAGER", "WRITER",
  "DOP", "LIGHTING", "SOUND", "ART_DIRECTOR",
  "VFX_SUPERVISOR", "EDITOR", "STAFF",
];

export type MemberWithUser = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
};

export type RoleGroup = {
  role: string;
  label: string;
  members: MemberWithUser[];
};

export function groupByRole(members: MemberWithUser[]): RoleGroup[] {
  const map = new Map<string, MemberWithUser[]>();

  for (const m of members) {
    if (!map.has(m.role)) map.set(m.role, []);
    map.get(m.role)!.push(m);
  }

  return ROLE_ORDER
    .filter((role) => map.has(role))
    .map((role) => ({
      role,
      label: MEMBER_ROLE_LABEL[role] ?? role,
      members: map.get(role)!,
    }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
bun test src/test/team.test.ts
```

Expected: 3 tests passed

- [ ] **Step 5: 전체 테스트 확인**

```bash
bun test
```

Expected: all existing tests still pass

- [ ] **Step 6: 커밋**

```bash
git add src/lib/team.ts src/test/team.test.ts
git commit -m "feat: add groupByRole helper with tests"
```

---

### Task 3: PATCH /api/users/[userId] — 전화번호 업데이트

**Files:**
- Create: `src/app/api/users/[userId]/route.ts`

- [ ] **Step 1: API route 작성**

```typescript
// src/app/api/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ userId: string }> };

// PATCH /api/users/[userId]
// Body: { phone: string }
// Auth: session.user.id must equal userId (self-edit only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  if (session.user?.id !== userId) {
    return NextResponse.json({ error: "본인 정보만 수정할 수 있습니다" }, { status: 403 });
  }

  const body = await req.json();
  const { phone } = body;

  if (typeof phone !== "string") {
    return NextResponse.json({ error: "phone은 문자열이어야 합니다" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { phone: phone.trim() || null },
    select: { id: true, name: true, email: true, phone: true },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: 수동 동작 확인 (서버 실행 중일 때)**

```bash
# 서버가 실행 중이어야 함 (bun dev)
# 브라우저 콘솔 또는 curl로 확인
curl -X PATCH http://localhost:3000/api/users/SOME_USER_ID \
  -H "Content-Type: application/json" \
  -d '{"phone":"010-1234-5678"}'
# Expected: 401 Unauthorized (세션 없이 호출 시)
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/users/
git commit -m "feat: PATCH /api/users/[userId] for phone update"
```

---

### Task 4: 팀 디렉토리 페이지 + 클라이언트 컴포넌트

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/team/page.tsx`
- Create: `src/app/(dashboard)/projects/[id]/team/team-directory-client.tsx`

- [ ] **Step 1: 서버 컴포넌트 작성**

```typescript
// src/app/(dashboard)/projects/[id]/team/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { groupByRole } from "@/lib/team";
import { TeamDirectoryClient } from "./team-directory-client";

type Props = { params: Promise<{ id: string }> };

export default async function TeamDirectoryPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const [project, members] = await Promise.all([
    db.project.findUnique({ where: { id }, select: { title: true } }),
    db.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!project) notFound();

  const groups = groupByRole(members);
  const currentUserId = session?.user?.id ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{project.title}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">팀 디렉토리</h1>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/projects/${id}/team/export?format=pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            PDF
          </a>
          <a
            href={`/api/projects/${id}/team/export?format=excel`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Excel
          </a>
        </div>
      </div>

      <TeamDirectoryClient
        groups={groups}
        currentUserId={currentUserId}
        projectId={id}
      />
    </div>
  );
}
```

- [ ] **Step 2: 클라이언트 컴포넌트 작성**

```typescript
// src/app/(dashboard)/projects/[id]/team/team-directory-client.tsx
"use client";

import { useState } from "react";
import type { RoleGroup } from "@/lib/team";

type Props = {
  groups: RoleGroup[];
  currentUserId: string | null;
  projectId: string;
};

export function TeamDirectoryClient({ groups, currentUserId }: Props) {
  const [phones, setPhones] = useState<Record<string, string | null>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getPhone(userId: string, original: string | null): string | null {
    return userId in phones ? phones[userId] : original;
  }

  function startEdit(userId: string, current: string | null) {
    setEditing(userId);
    setEditValue(current ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue("");
    setError(null);
  }

  async function savePhone(userId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editValue }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "저장 실패");
        return;
      }
      setPhones((prev) => ({ ...prev, [userId]: editValue.trim() || null }));
      setEditing(null);
    } catch {
      setError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  if (groups.length === 0) {
    return (
      <p className="text-center text-gray-400 py-16">
        팀원이 없습니다. 설정 &gt; 팀 관리에서 초대하세요.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.role}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-2">
            {group.label}
          </h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {group.members.map((m) => {
              const phone = getPhone(m.user.id, m.user.phone);
              const isEditing = editing === m.user.id;
              const canEdit = m.user.id === currentUserId;

              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                    <p className="text-xs text-gray-500">{m.user.email}</p>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="010-0000-0000"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") savePhone(m.user.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <button
                        onClick={() => savePhone(m.user.id)}
                        disabled={saving}
                        className="text-xs text-blue-700 font-medium hover:text-blue-900 disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${phone ? "text-gray-800" : "text-gray-400"}`}>
                        {phone ?? "(미등록)"}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => startEdit(m.user.id, phone)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          aria-label="전화번호 편집"
                        >
                          ✎
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 브라우저에서 확인**

`bun dev` 실행 후 `/projects/[실제 프로젝트 ID]/team` 방문.
확인: 부서별 멤버 목록, "(미등록)" 표시, 본인 행에만 ✎ 버튼.

- [ ] **Step 4: 커밋**

```bash
git add src/app/\(dashboard\)/projects/\[id\]/team/
git commit -m "feat: team directory page with inline phone editing"
```

---

### Task 5: PDF 컴포넌트

**Files:**
- Create: `src/components/team-directory-pdf.tsx`

- [ ] **Step 1: PDF 컴포넌트 작성**

```typescript
// src/components/team-directory-pdf.tsx
"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { RoleGroup } from "@/lib/team";

// Reuse same Korean font as call-sheet-pdf.tsx
Font.register({
  family: "NotoSansKR",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.0.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.9.woff2",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    fontSize: 9,
    padding: 24,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#1E40AF",
    paddingBottom: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: { fontSize: 14, fontWeight: 700, color: "#1E40AF" },
  subtitle: { fontSize: 9, color: "#6B7280" },
  sectionHeader: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
    marginTop: 10,
  },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: "#1E40AF" },
  row: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  colName: { width: "25%", fontWeight: 700 },
  colRole: { width: "20%", color: "#4B5563" },
  colPhone: { width: "25%" },
  colEmail: { width: "30%", color: "#6B7280" },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  tableHeaderText: { fontSize: 8, color: "#6B7280", fontWeight: 700 },
});

type Props = {
  projectTitle: string;
  date: string;
  groups: RoleGroup[];
};

export function TeamDirectoryPDF({ projectTitle, date, groups }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{projectTitle} 팀 연락망</Text>
          </View>
          <Text style={styles.subtitle}>{date}</Text>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colName, styles.tableHeaderText]}>이름</Text>
          <Text style={[styles.colRole, styles.tableHeaderText]}>역할</Text>
          <Text style={[styles.colPhone, styles.tableHeaderText]}>전화번호</Text>
          <Text style={[styles.colEmail, styles.tableHeaderText]}>이메일</Text>
        </View>

        {/* Sections */}
        {groups.map((group) => (
          <View key={group.role}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{group.label}</Text>
            </View>
            {group.members.map((m) => (
              <View key={m.id} style={styles.row}>
                <Text style={styles.colName}>{m.user.name}</Text>
                <Text style={styles.colRole}>{group.label}</Text>
                <Text style={styles.colPhone}>{m.user.phone ?? "—"}</Text>
                <Text style={styles.colEmail}>{m.user.email}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/team-directory-pdf.tsx
git commit -m "feat: TeamDirectoryPDF react-pdf component"
```

---

### Task 6: Export API route (PDF + Excel)

**Files:**
- Create: `src/app/api/projects/[id]/team/export/route.ts`

- [ ] **Step 1: export route 작성**

```typescript
// src/app/api/projects/[id]/team/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { groupByRole } from "@/lib/team";
import { renderToBuffer } from "@react-pdf/renderer";
import { TeamDirectoryPDF } from "@/components/team-directory-pdf";
import ExcelJS from "exceljs";
import React from "react";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/team/export?format=pdf|excel
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";

  const [project, members] = await Promise.all([
    db.project.findUnique({ where: { id }, select: { title: true } }),
    db.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });

  const groups = groupByRole(members);
  const date = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });
  const slug = project.title.replace(/\s+/g, "-");

  if (format === "excel") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("팀 연락망");

    // Column definitions
    sheet.columns = [
      { header: "부서", key: "dept", width: 16 },
      { header: "이름", key: "name", width: 14 },
      { header: "전화번호", key: "phone", width: 16 },
      { header: "이메일", key: "email", width: 28 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    headerRow.alignment = { vertical: "middle" };
    headerRow.height = 20;

    // Data rows
    for (const group of groups) {
      for (const m of group.members) {
        sheet.addRow({
          dept: group.label,
          name: m.user.name,
          phone: m.user.phone ?? "",
          email: m.user.email,
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="team-${slug}-${date}.xlsx"`,
      },
    });
  }

  // Default: PDF
  const buffer = await renderToBuffer(
    React.createElement(TeamDirectoryPDF, { projectTitle: project.title, date, groups })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="team-${slug}-${date}.pdf"`,
    },
  });
}
```

- [ ] **Step 2: PDF 내보내기 브라우저 확인**

`bun dev` 실행 후:
- `/projects/[id]/team` 방문 → [PDF] 버튼 클릭 → PDF 파일 다운로드 확인
- [Excel] 버튼 클릭 → `.xlsx` 파일 다운로드 확인

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/projects/\[id\]/team/
git commit -m "feat: team export route — PDF and Excel"
```

---

### Task 7: 프로젝트 페이지에 팀 디렉토리 링크 추가

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: 프로젝트 페이지에서 팀 카드 섹션 찾기**

`src/app/(dashboard)/projects/[id]/page.tsx`를 열고 "팀원" 또는 `members` 관련 섹션을 찾는다.
현재 `project._count.members`를 표시하는 카드가 있는지 확인.

- [ ] **Step 2: 팀 디렉토리 링크 추가**

프로젝트 상세 페이지에서 팀원 수 표시 섹션에 링크 추가.
페이지 내 팀원 카운트 옆에 아래를 추가:

```typescript
// 팀원 카운트를 표시하는 섹션 근처에 추가
<Link
  href={`/projects/${id}/team`}
  className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline mt-1"
>
  팀 디렉토리 →
</Link>
```

정확한 삽입 위치는 파일 내 `members` 또는 "팀" 문자열을 검색해 확인.

- [ ] **Step 3: 브라우저 확인**

프로젝트 상세 페이지에서 "팀 디렉토리 →" 링크가 보이고 클릭 시 `/team` 페이지로 이동 확인.

- [ ] **Step 4: 최종 테스트**

```bash
bun test
```

Expected: all tests pass (groupByRole 포함)

- [ ] **Step 5: 커밋**

```bash
git add src/app/\(dashboard\)/projects/\[id\]/page.tsx
git commit -m "feat: add team directory link to project page"
```

---

## 완료 기준

- [ ] `/projects/[id]/team` 페이지 접근 가능
- [ ] 부서별 그룹으로 팀원 표시
- [ ] 본인 전화번호 인라인 편집 가능
- [ ] PDF 다운로드 시 한국어 이름 렌더링 정상
- [ ] Excel 다운로드 시 부서·이름·전화번호·이메일 컬럼 정상
- [ ] `bun test` 전체 통과
