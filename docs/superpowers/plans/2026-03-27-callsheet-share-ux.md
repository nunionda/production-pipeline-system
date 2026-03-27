# 콜시트 공유 UX 완성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 콜시트 공유 UX 완성 — 작품명 헤더, 확인 완료 Yellow 카드 배지, 에러/로딩 스켈레톤 polish, 촬영일 상세에 링크 공유 버튼 추가

**Architecture:** 이미 구축된 `CallSheetShare` / `CallSheetConfirmation` 모델, `/api/c/[token]` 공개 API, `/c/[token]` 페이지 위에 polish 레이어 추가. 신규 코드는 최소화 — (1) API 응답에 projectTitle 추가, (2) `/c/[token]` 페이지 3가지 UX 수정, (3) 촬영일 상세에 share 버튼 컴포넌트 추가. 순수 함수 `findActorInCast`를 `src/lib/callsheet.ts`로 추출해 테스트 가능하게 만든다.

**Tech Stack:** Next.js 15 App Router, React 클라이언트 컴포넌트, Prisma, Tailwind CSS, Vitest

---

## 기존 코드 현황 (읽기 전에 숙지)

구현 전 반드시 읽을 파일:
- `src/app/api/c/[token]/route.ts` — 공개 조회 API
- `src/app/c/[token]/page.tsx` — 공개 콜시트 페이지 (클라이언트 컴포넌트)
- `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx` — 촬영일 상세

현재 DB 관계: `CallSheetShare.shootingDayId → ShootingDay → Schedule → Project`

## File Structure

| 파일 | 역할 |
|------|------|
| `src/app/api/c/[token]/route.ts` | 수정: shootingDay include에 schedule.project.title 추가 |
| `src/lib/callsheet.ts` | 신규: `findActorInCast` 순수 함수 + `CastEntry` 타입 |
| `src/test/callsheet.test.ts` | 신규: `findActorInCast` 단위 테스트 |
| `src/app/c/[token]/page.tsx` | 수정: projectTitle 헤더, 확인 완료 badge, 에러 카드, 로딩 스켈레톤 |
| `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/callsheet-share-button.tsx` | 신규: 공유 링크 생성 + 복사 클라이언트 컴포넌트 |
| `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx` | 수정: CallsheetShareButton 추가 |

---

### Task 1: API — 공유 링크 응답에 projectTitle 추가

**Files:**
- Modify: `src/app/api/c/[token]/route.ts`

현재 `db.callSheetShare.findUnique`의 `include.shootingDay` 셀렉트에 `schedule.project.title`이 없어서 헤더에 작품명 표시 불가.

- [ ] **Step 1: 파일 읽기**

```bash
cat src/app/api/c/\[token\]/route.ts
```

- [ ] **Step 2: shootingDay include에 schedule → project.title 추가**

`src/app/api/c/[token]/route.ts` 전체를 아래로 교체:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

// GET /api/c/[token]
// Public endpoint — no auth required. Returns call sheet data for sharing.
// Increments viewCount on each request.
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const share = await db.callSheetShare.findUnique({
    where: { token },
    include: {
      callSheet: true,
      shootingDay: {
        select: {
          date: true,
          location: true,
          callTime: true,
          notes: true,
          schedule: {
            select: {
              project: { select: { title: true } },
            },
          },
        },
      },
    },
  });

  if (!share) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다" }, { status: 404 });
  }

  if (share.expiresAt < new Date()) {
    return NextResponse.json({ error: "링크가 만료되었습니다" }, { status: 410 });
  }

  // Increment view count (fire-and-forget, don't block response)
  db.callSheetShare
    .update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  return NextResponse.json(share);
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/c/\[token\]/route.ts
git commit -m "feat: include project title in callsheet share API response"
```

---

### Task 2: `findActorInCast` 순수 함수 추출 + 테스트

**Files:**
- Create: `src/lib/callsheet.ts`
- Create: `src/test/callsheet.test.ts`

현재 `/c/[token]/page.tsx` 하단에 `type CastEntry = ...`와 인라인 `cast.find(...)` 로직이 있다. 이를 추출해 테스트 가능하게 만든다.

- [ ] **Step 1: 실패 테스트 작성**

`src/test/callsheet.test.ts` 신규 생성:

```typescript
import { describe, it, expect } from "vitest";
import { findActorInCast } from "@/lib/callsheet";

const cast = [
  { name: "김민준", role: "수진", callTime: "06:00" },
  { name: "이수진", role: "민호", callTime: "07:00" },
  { name: "박지원", callTime: "08:00" },
];

describe("findActorInCast", () => {
  it("이름으로 배우를 찾는다", () => {
    const result = findActorInCast(cast, "김민준");
    expect(result?.name).toBe("김민준");
  });

  it("역할명으로 배우를 찾는다", () => {
    const result = findActorInCast(cast, "민호");
    expect(result?.name).toBe("이수진");
  });

  it("actorParam이 빈 문자열이면 null 반환", () => {
    expect(findActorInCast(cast, "")).toBeNull();
  });

  it("일치하는 배우가 없으면 null 반환", () => {
    expect(findActorInCast(cast, "없는사람")).toBeNull();
  });

  it("cast가 빈 배열이면 null 반환", () => {
    expect(findActorInCast([], "김민준")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/test/callsheet.test.ts 2>&1 | tail -5
```

Expected: FAIL with `Cannot find module '@/lib/callsheet'`

- [ ] **Step 3: `src/lib/callsheet.ts` 구현**

```typescript
export type CastEntry = {
  name: string;
  role?: string;
  callTime?: string;
};

/**
 * URL ?actor= 파라미터로 출연진 목록에서 해당 배우를 찾는다.
 * 이름 또는 역할명으로 매칭한다. actorParam이 비어있으면 null.
 */
export function findActorInCast(
  cast: CastEntry[],
  actorParam: string
): CastEntry | null {
  if (!actorParam) return null;
  return (
    cast.find((c) => c.name === actorParam || c.role === actorParam) ?? null
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/test/callsheet.test.ts 2>&1 | tail -5
```

Expected: 5 tests passing

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
npx vitest run 2>&1 | tail -4
```

Expected: 64 tests passing (59 baseline + 5 new)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/callsheet.ts src/test/callsheet.test.ts
git commit -m "feat: extract findActorInCast helper with tests"
```

---

### Task 3: `/c/[token]` 페이지 UX Polish

**Files:**
- Modify: `src/app/c/[token]/page.tsx`

**4가지 변경 사항:**
1. `CastEntry` 타입 인라인 정의 → `@/lib/callsheet` import로 교체
2. **확인 완료 상태**: Yellow 카드에 `{confirmed && <green badge>}` 추가
3. **에러 카드**: 텍스트만 있는 에러 화면 → 카드 형태 + "제작사에 문의해 주세요"
4. **로딩 스켈레톤**: "로딩 중…" 텍스트 → 헤더 + 카드 스켈레톤
5. **작품명 헤더**: `data.shootingDay.schedule.project.title` 표시

Task 1에서 API 응답에 `schedule.project.title`이 추가됐으므로 타입도 맞춰 업데이트.

- [ ] **Step 1: 파일 읽기**

```bash
cat "src/app/c/[token]/page.tsx"
```

- [ ] **Step 2: 전체 파일 교체**

`src/app/c/[token]/page.tsx` 전체를 아래 내용으로 교체:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { findActorInCast, type CastEntry } from "@/lib/callsheet";

type CallSheetShare = {
  id: string;
  token: string;
  expiresAt: string;
  shootingDay: {
    date: string;
    location: string | null;
    callTime: string | null;
    notes: string | null;
    schedule: {
      project: { title: string };
    };
  };
  callSheet: {
    callTime: string;
    scenes: unknown;
    cast: unknown;
    crew: unknown;
    equipment: unknown;
    meals: unknown;
    notes: string | null;
  };
};

export default function PublicCallSheetPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const actorParam = searchParams.get("actor") ?? "";

  const [data, setData] = useState<CallSheetShare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actorName, setActorName] = useState(actorParam);

  useEffect(() => {
    fetch(`/api/c/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("콜시트를 불러올 수 없습니다"));
  }, [token]);

  async function handleConfirm() {
    if (!actorName.trim()) return;
    setConfirming(true);
    const res = await fetch(`/api/c/${token}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorName }),
    });
    setConfirming(false);
    if (res.ok) {
      setConfirmed(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "확인에 실패했습니다");
    }
  }

  // 에러 상태: 카드 형태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <p className="text-3xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-900">링크를 찾을 수 없습니다</h2>
          <p className="text-sm text-gray-500 mt-2">제작사에 문의해 주세요.</p>
        </div>
      </div>
    );
  }

  // 로딩 상태: 스켈레톤
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="bg-blue-800 h-28" />
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="bg-white rounded-lg h-24" />
          <div className="bg-white rounded-lg h-40" />
          <div className="bg-white rounded-lg h-32" />
        </div>
      </div>
    );
  }

  const cast = Array.isArray(data.callSheet.cast) ? (data.callSheet.cast as CastEntry[]) : [];
  const myEntry = findActorInCast(cast, actorParam);
  const projectTitle = data.shootingDay.schedule.project.title;

  const shootDate = new Date(data.shootingDay.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-800 text-white px-4 py-5">
        <p className="text-xs opacity-70 uppercase tracking-wide">{projectTitle} 콜시트</p>
        <h1 className="text-xl font-bold mt-1">{shootDate}</h1>
        {data.shootingDay.location && (
          <p className="text-sm opacity-90 mt-0.5">{data.shootingDay.location}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs bg-blue-700 rounded px-2 py-0.5">호출</span>
          <span className="font-semibold">{data.callSheet.callTime}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* 내 콜타임 하이라이트 — 확인 완료 후에도 Yellow 카드 유지 + green badge */}
        {myEntry && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-yellow-700 font-medium uppercase">내 콜타임</p>
              {confirmed && (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  ✓ 확인 완료
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-yellow-800 mt-1">
              {myEntry.callTime ?? data.callSheet.callTime}
            </p>
            <p className="text-sm text-yellow-700 mt-0.5">
              {myEntry.name}
              {myEntry.role ? ` (${myEntry.role})` : ""}
            </p>
          </div>
        )}

        {/* Cast list */}
        {cast.length > 0 && (
          <section className="bg-white rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 px-4 pt-4 pb-2 border-b">출연진 호출</h2>
            <ul className="divide-y">
              {cast.map((c, i) => (
                <li
                  key={i}
                  className={`px-4 py-3 flex justify-between items-center ${
                    c.name === actorParam || c.role === actorParam ? "bg-yellow-50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
                  </div>
                  <p className="text-sm font-semibold text-blue-800">
                    {c.callTime ?? data.callSheet.callTime}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Notes */}
        {data.callSheet.notes && (
          <section className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">특이사항</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.callSheet.notes}</p>
          </section>
        )}

        {/* 확인 섹션 */}
        <section className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">콜시트 확인</h2>
          {confirmed ? (
            <div className="text-center py-2">
              <p className="text-green-600 font-semibold text-lg">
                ✔ {actorName} 님 확인 완료
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="이름 입력 (예: 김민준)"
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleConfirm}
                disabled={!actorName.trim() || confirming}
                className="w-full bg-blue-800 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform"
              >
                {confirming ? "확인 중…" : "콜시트 확인했습니다"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
npx vitest run 2>&1 | tail -4
```

Expected: 64 tests passing

- [ ] **Step 4: 커밋**

```bash
git add "src/app/c/[token]/page.tsx"
git commit -m "feat: polish /c/[token] page — project title, confirm badge, error card, loading skeleton"
```

---

### Task 4: 촬영일 상세에 콜시트 공유 링크 버튼 추가

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/callsheet-share-button.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx`

텔레그램 없이 링크만 복사하는 경로. 클릭 → `POST .../call-sheet/share` → URL 표시 → 복사.

상태 흐름: `idle` → (click) → `loading` → `ready` (URL 표시 + 복사 버튼) | `error`

- [ ] **Step 1: `callsheet-share-button.tsx` 신규 생성**

`src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/callsheet-share-button.tsx`:

```typescript
"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  scheduleId: string;
  dayId: string;
  hasCallSheet: boolean;
};

type State = "idle" | "loading" | "ready" | "error";

export function CallsheetShareButton({ projectId, scheduleId, dayId, hasCallSheet }: Props) {
  const [state, setState] = useState<State>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setState("loading");
    try {
      const res = await fetch(
        `/api/projects/${projectId}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet/share`,
        { method: "POST" }
      );
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json();
      setShareUrl(`${window.location.origin}/c/${data.token}`);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!hasCallSheet) {
    return (
      <button
        disabled
        title="콜시트가 없습니다"
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
      >
        링크 공유
      </button>
    );
  }

  if (state === "ready" && shareUrl) {
    return (
      <div className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1">
        <span className="text-xs text-gray-500 max-w-[140px] truncate">/c/{shareUrl.split("/c/")[1]}</span>
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap"
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        재시도
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {state === "loading" ? "생성 중…" : "링크 공유"}
    </button>
  );
}
```

- [ ] **Step 2: 촬영일 상세 `page.tsx` 수정**

`src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx` 파일을 읽은 뒤 아래 두 가지를 수정한다.

**2a. import 추가** — 기존 import 블록 끝에:
```typescript
import { CallsheetShareButton } from "./callsheet-share-button";
```

**2b. 버튼 영역** — 현재 PDF 버튼과 TelegramSendButton 사이에 `CallsheetShareButton` 삽입:

현재:
```tsx
        {/* PDF download button */}
        <a
          href={`/api/projects/${id}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          콜시트 PDF
        </a>
        <TelegramSendButton
```

변경 후:
```tsx
        {/* Header action buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/projects/${id}/schedules/${scheduleId}/shooting-days/${dayId}/call-sheet/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            콜시트 PDF
          </a>
          <CallsheetShareButton
            projectId={id}
            scheduleId={scheduleId}
            dayId={dayId}
            hasCallSheet={day.callSheets.length > 0}
          />
          <TelegramSendButton
            projectId={id}
            scheduleId={scheduleId}
            dayId={dayId}
            hasTelegramGroup={!!project?.telegramChatId}
          />
        </div>
```

(TelegramSendButton의 닫는 `/>` 뒤에 있던 `</div>` 는 새 wrapper div의 `</div>`로 대체됨 — 기존 flex container가 하나 제거되고 명시적 gap div로 교체.)

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
npx vitest run 2>&1 | tail -4
```

Expected: 64 tests passing

- [ ] **Step 4: 커밋**

```bash
git add "src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/callsheet-share-button.tsx" \
        "src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx"
git commit -m "feat: add callsheet share link button to shooting day detail page"
```

---

## 완료 기준

- `npx vitest run` → 64 tests passing (59 baseline + 5 new)
- `/c/[token]` 페이지: 헤더에 작품명 표시, 확인 완료 후 Yellow 카드 + green badge 유지, 에러는 카드 형태, 로딩은 스켈레톤
- 촬영일 상세 페이지: [콜시트 PDF] [링크 공유] [텔레그램 발송] 3버튼 가로 정렬
- 콜시트 없을 때 링크 공유 버튼 disabled (회색, tooltip)
