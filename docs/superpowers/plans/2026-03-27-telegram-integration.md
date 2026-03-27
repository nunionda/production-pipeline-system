# 텔레그램 봇 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카카오톡을 텔레그램으로 대체 — 콜시트 그룹 공지, PDF 첨부, 팀원 개인 DM 확인 요청, 스케줄/날씨 변경 알림을 텔레그램으로 처리한다.

**Architecture:** Telegram Bot API webhook 방식으로 팀원 개인 연결 (deep link `/start <code>`). 프로젝트 그룹은 Chat ID 직접 입력. 콜시트 발송은 수동 버튼 + Vercel Cron 자동발송(KST 19:00)으로 이원화. 알림은 스케줄 변경 PATCH 직후 즉시 발송.

**Tech Stack:** Telegram Bot API (sendMessage, sendDocument, setWebhook), Next.js API Routes, Prisma, Vercel Cron, @react-pdf/renderer (PDF 재사용), Vitest

---

## File Structure

| 파일 | 역할 |
|------|------|
| `prisma/schema.prisma` | User.telegramChatId, User.telegramLinkCode, Project.telegramChatId 필드 추가 |
| `src/lib/telegram.ts` | Bot API 래퍼 (sendMessage, sendDocument, setWebhook) + 순수 함수 (buildCallsheetMessage, buildDmMessage, parseTelegramUpdate, buildNotifyMessage) |
| `src/app/api/users/[userId]/telegram-link/route.ts` | POST — 6자리 링크 코드 생성, 딥링크 반환 |
| `src/app/api/telegram/webhook/route.ts` | POST — /start 코드 파싱 → chatId 저장 |
| `src/app/api/projects/[id]/telegram/send/route.ts` | POST — 수동 콜시트 발송 (그룹 + 개인 DM) |
| `src/app/api/cron/telegram-callsheet/route.ts` | GET — 자동 발송 Cron 엔드포인트 |
| `src/app/api/projects/[id]/telegram/notify/route.ts` | POST — 스케줄 변경 알림 |
| `src/app/api/projects/[id]/route.ts` | PATCH에 telegramChatId 처리 추가 |
| `src/app/api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/route.ts` | PATCH 후 텔레그램 알림 트리거 |
| `vercel.json` | Cron 설정 |
| `src/app/(dashboard)/projects/[id]/page.tsx` | 텔레그램 설정 섹션 추가 |
| `src/components/telegram-settings-form.tsx` | Client component — Chat ID 입력 + 저장 + 테스트 발송 |
| `src/app/(dashboard)/projects/[id]/team/page.tsx` | 팀 디렉토리 (신규) — 텔레그램 연결 상태 표시 |
| `src/components/telegram-link-button.tsx` | Client component — 딥링크 팝업 버튼 |
| `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/telegram-send-button.tsx` | Client component — 텔레그램 발송 버튼 |
| `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx` | TelegramSendButton 추가 |
| `.env.example` | 새 환경 변수 4개 추가 |
| `src/test/telegram.test.ts` | 순수 함수 단위 테스트 |

---

## Task 1: DB 마이그레이션 — 텔레그램 필드 추가

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: User 모델에 텔레그램 필드 추가**

`prisma/schema.prisma`의 User 모델 `updatedAt` 줄 바로 뒤에 추가:

```prisma
model User {
  id             String    @id @default(cuid())
  name           String
  email          String    @unique
  hashedPassword String
  role           UserRole  @default(STAFF)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // 텔레그램
  telegramChatId   String?   // 개인 DM chat_id (봇과 연결 후 저장)
  telegramLinkCode String?   // /start 연결용 일회성 코드 (연결 완료 후 null)

  // Relations
  projects       ProjectMember[]
  auditLogs      AuditLog[]
  sessions       Session[]
}
```

- [ ] **Step 2: Project 모델에 텔레그램 필드 추가**

Project 모델 `updatedAt` 줄 바로 뒤에 추가:

```prisma
  // 텔레그램
  telegramChatId   String?   // 그룹 채팅 chat_id
```

- [ ] **Step 3: 마이그레이션 실행**

```bash
cd /Users/daniel/dev/antigravity-dev/nunionda
bunx prisma migrate dev --name add_telegram_fields
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 4: Prisma 클라이언트 재생성**

```bash
bunx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 5: 테스트 통과 확인**

```bash
bunx vitest run
```

Expected: 기존 테스트 모두 PASS (새 필드는 옵셔널이므로 기존 테스트 영향 없음)

- [ ] **Step 6: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add telegram fields to User and Project models"
```

---

## Task 2: `src/lib/telegram.ts` — Bot API 래퍼 + 메시지 포맷 함수

**Files:**
- Create: `src/lib/telegram.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/lib/telegram.ts

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = "https://api.telegram.org/bot";

// ──────────────────────────────────────────────
// Bot API 래퍼
// ──────────────────────────────────────────────

export async function sendMessage(
  chatId: string | number,
  text: string
): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const res = await fetch(`${BASE_URL}${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendDocument(
  chatId: string | number,
  buffer: Buffer,
  filename: string,
  caption?: string
): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append(
      "document",
      new Blob([buffer], { type: "application/pdf" }),
      filename
    );
    if (caption) form.append("caption", caption);
    const res = await fetch(`${BASE_URL}${BOT_TOKEN}/sendDocument`, {
      method: "POST",
      body: form,
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  try {
    const res = await fetch(`${BASE_URL}${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        ...(secret && { secret_token: secret }),
      }),
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// 순수 함수: 메시지 포맷 (테스트 가능)
// ──────────────────────────────────────────────

export type CallsheetMessageData = {
  projectTitle: string;
  dayNumber: number;
  date: Date;
  location?: string | null;
  callTime?: string | null;
  shootTime?: string | null;
  sceneNumbers: number[];
  shareUrl: string;
  tempMax?: number | null;
  tempMin?: number | null;
};

const WEEK_KR = ["일", "월", "화", "수", "목", "금", "토"];

export function buildCallsheetMessage(data: CallsheetMessageData): string {
  const d = data.date;
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${WEEK_KR[d.getDay()]})`;
  const sceneList = data.sceneNumbers.length > 0
    ? `씬: ${data.sceneNumbers.map((n) => `S${n}`).join(", ")} (총 ${data.sceneNumbers.length}씬)`
    : "씬: 미정";
  const timeLine =
    data.callTime || data.shootTime
      ? `⏰ ${data.callTime ? `호출 ${data.callTime}` : ""}${data.callTime && data.shootTime ? " / " : ""}${data.shootTime ? `촬영 ${data.shootTime}` : ""}`
      : "";
  const weatherLine =
    data.tempMax != null && data.tempMin != null
      ? `🌤 ${data.tempMax}°C / ${data.tempMin}°C`
      : "";

  const lines = [
    `🎬 ${data.projectTitle} D+${data.dayNumber} 콜시트`,
    `📅 ${dateStr}`,
    data.location ? `📍 ${data.location}` : "",
    timeLine,
    weatherLine,
    "",
    sceneList,
    "",
    `👉 콜시트 확인: ${data.shareUrl}`,
  ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""));

  return lines.join("\n").trim();
}

export type DmMessageData = {
  memberName: string;
  date: Date;
  shareUrl: string;
};

export function buildDmMessage(data: DmMessageData): string {
  const d = data.date;
  const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return [
    `안녕하세요 ${data.memberName}님,`,
    `내일(${dateStr}) 촬영 콜시트를 확인해 주세요.`,
    ``,
    `👉 ${data.shareUrl}`,
    ``,
    `위 링크에서 이름 입력 시 확인 처리됩니다.`,
  ].join("\n");
}

export type NotifyChangeType = "LOCATION" | "CALLTIME" | "WEATHER";

export function buildNotifyMessage(
  dayNumber: number,
  changeType: NotifyChangeType,
  oldValue: string,
  newValue: string
): string {
  switch (changeType) {
    case "LOCATION":
      return `📢 [D+${dayNumber}] 장소 변경: ${oldValue} → ${newValue}`;
    case "CALLTIME":
      return `⏰ [D+${dayNumber}] 콜타임 변경: ${oldValue} → ${newValue}`;
    case "WEATHER":
      return `⚠️ [D+${dayNumber}] 촬영지 날씨 변경: ${oldValue} → ${newValue}`;
  }
}

// ──────────────────────────────────────────────
// 순수 함수: Webhook 파싱 (테스트 가능)
// ──────────────────────────────────────────────

export type TelegramUpdate = {
  chatId: number;
  text: string;
};

export function parseTelegramUpdate(body: unknown): TelegramUpdate | null {
  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof (body as Record<string, unknown>).message !== "object"
  ) {
    return null;
  }
  const msg = (body as Record<string, unknown>).message as Record<string, unknown>;
  const from = msg.from as Record<string, unknown> | undefined;
  const chatId = from?.id;
  const text = msg.text;
  if (typeof chatId !== "number" || typeof text !== "string") return null;
  return { chatId, text };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/telegram.ts
git commit -m "feat: add telegram.ts Bot API wrapper and message format helpers"
```

---

## Task 3: `src/app/api/users/[userId]/telegram-link/route.ts` — 딥링크 코드 생성

**Files:**
- Create: `src/app/api/users/[userId]/telegram-link/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: 라우트 파일 생성**

```typescript
// src/app/api/users/[userId]/telegram-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ userId: string }> };

// POST /api/users/[userId]/telegram-link
// 6자리 랜덤 코드 생성 후 딥링크 반환
// 권한: 본인 또는 같은 프로젝트의 PD
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  // 본인이거나 공통 프로젝트의 PD인지 확인
  const isSelf = session.user.id === userId;
  if (!isSelf) {
    const sharedProject = await db.projectMember.findFirst({
      where: {
        userId: session.user.id,
        role: "PD",
        project: {
          members: { some: { userId } },
        },
      },
    });
    if (!sharedProject) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // 6자리 랜덤 코드 생성 (영숫자)
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await db.user.update({
    where: { id: userId },
    data: { telegramLinkCode: code },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return NextResponse.json({ error: "TELEGRAM_BOT_USERNAME 환경 변수가 설정되지 않았습니다" }, { status: 500 });
  }

  const deepLink = `https://t.me/${botUsername}?start=${code}`;
  return NextResponse.json({ deepLink, code }, { status: 201 });
}
```

- [ ] **Step 2: .env.example에 환경 변수 추가**

기존 `.env.example` 파일 끝에 추가:

```env
# Telegram Bot Integration
TELEGRAM_BOT_TOKEN=          # BotFather에서 발급 (예: 123456789:AAF...)
TELEGRAM_BOT_USERNAME=       # 봇 username (예: nunionda_bot, @ 없이)
TELEGRAM_WEBHOOK_SECRET=     # 임의 문자열, webhook 검증용
CRON_SECRET=                 # Cron 엔드포인트 외부 호출 차단용
NEXT_PUBLIC_APP_URL=         # https://yourdomain.com
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/users/ .env.example
git commit -m "feat: add telegram-link route for generating deep link codes"
```

---

## Task 4: `src/app/api/telegram/webhook/route.ts` — /start 수신 처리

**Files:**
- Create: `src/app/api/telegram/webhook/route.ts`

- [ ] **Step 1: 라우트 파일 생성**

```typescript
// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMessage, parseTelegramUpdate } from "@/lib/telegram";

// POST /api/telegram/webhook
// Telegram Bot API가 호출하는 webhook 엔드포인트
// 항상 200 반환 (텔레그램 재전송 방지)
export async function POST(req: NextRequest) {
  // X-Telegram-Bot-Api-Secret-Token 헤더 검증
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (headerSecret !== secret) {
      // 200 반환해야 Telegram이 재시도하지 않음
      return NextResponse.json({ ok: false }, { status: 200 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const update = parseTelegramUpdate(body);
  if (!update) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { chatId, text } = update;

  // /start <code> 처리
  if (text.startsWith("/start ")) {
    const code = text.slice(7).trim().toUpperCase();
    if (code) {
      const user = await db.user.findFirst({
        where: { telegramLinkCode: code },
      });
      if (user) {
        await db.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: String(chatId),
            telegramLinkCode: null,
          },
        });
        await sendMessage(
          chatId,
          `✅ 연결 완료! 안녕하세요 ${user.name}님, 이제 콜시트 알림을 받을 수 있습니다.`
        );
      } else {
        await sendMessage(chatId, "올바르지 않은 코드입니다. 앱에서 새 링크를 생성해 주세요.");
      }
    }
  }

  // 항상 200 반환
  return NextResponse.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/telegram/
git commit -m "feat: add telegram webhook route for /start link flow"
```

---

## Task 5: `src/app/api/projects/[id]/telegram/send/route.ts` — 수동 콜시트 발송

**Files:**
- Create: `src/app/api/projects/[id]/telegram/send/route.ts`

이 라우트는:
1. 프로젝트의 `telegramChatId`에 그룹 메시지 + PDF 발송
2. 콜시트 공유 링크 생성 (CallSheetShare)
3. 텔레그램 연결된 팀원 전원에게 개인 DM 발송

- [ ] **Step 1: 라우트 파일 생성**

```typescript
// src/app/api/projects/[id]/telegram/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { CallSheetPDF } from "@/components/call-sheet-pdf";
import {
  sendMessage,
  sendDocument,
  buildCallsheetMessage,
  buildDmMessage,
} from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/telegram/send
// Body: { dayId: string, scheduleId: string }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const { dayId, scheduleId } = await req.json() as { dayId: string; scheduleId: string };

  if (!dayId || !scheduleId) {
    return NextResponse.json({ error: "dayId, scheduleId 필수" }, { status: 400 });
  }

  // 프로젝트 + 팀원 조회
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, telegramChatId: true },
          },
        },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  if (!project.telegramChatId) {
    return NextResponse.json({ error: "텔레그램 그룹이 연결되지 않았습니다" }, { status: 400 });
  }

  // 촬영일 + 씬 조회
  const day = await db.shootingDay.findUnique({
    where: { id: dayId },
    include: {
      schedule: { select: { id: true } },
      sceneStatuses: {
        include: {
          scene: { include: { characters: { include: { character: true } } } },
        },
        orderBy: { scene: { number: "asc" } },
      },
      callSheets: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  if (!day) return NextResponse.json({ error: "촬영일 없음" }, { status: 404 });

  // 촬영일 번호 계산 (같은 스케줄 내 순서)
  const allDays = await db.shootingDay.findMany({
    where: { scheduleId },
    orderBy: { date: "asc" },
    select: { id: true },
  });
  const dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;

  // 공유 링크 생성 또는 재사용
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let shareUrl = `${appUrl}/projects/${projectId}/schedule/${scheduleId}/day/${dayId}`;

  if (day.callSheets[0]) {
    const existingShare = await db.callSheetShare.findFirst({
      where: {
        shootingDayId: dayId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    const share = existingShare ?? await db.callSheetShare.create({
      data: {
        callSheetId: day.callSheets[0].id,
        shootingDayId: dayId,
        expiresAt: new Date(day.date.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    shareUrl = `${appUrl}/c/${share.token}`;
  }

  // 그룹 메시지 발송
  const sceneNumbers = day.sceneStatuses.map((s) => s.scene.number);
  const groupMessage = buildCallsheetMessage({
    projectTitle: project.title,
    dayNumber,
    date: day.date,
    location: day.location,
    callTime: day.callTime,
    shootTime: day.shootTime,
    sceneNumbers,
    shareUrl,
  });
  await sendMessage(project.telegramChatId, groupMessage);

  // PDF 발송
  if (day.callSheets[0]) {
    try {
      const pdfBuffer = await renderToBuffer(
        React.createElement(CallSheetPDF, {
          day,
          project: { title: project.title },
          scheduleId,
        })
      );
      await sendDocument(
        project.telegramChatId,
        Buffer.from(pdfBuffer),
        `D+${dayNumber}_콜시트.pdf`,
        `${project.title} D+${dayNumber} 콜시트`
      );
    } catch (err) {
      console.error("[telegram/send] PDF 생성 실패:", err);
    }
  }

  // 개인 DM 발송 (telegramChatId 있는 팀원만)
  const dmResults = await Promise.allSettled(
    project.members
      .filter((m) => m.user.telegramChatId)
      .map((m) =>
        sendMessage(
          m.user.telegramChatId!,
          buildDmMessage({
            memberName: m.user.name,
            date: day.date,
            shareUrl,
          })
        )
      )
  );

  const dmSent = dmResults.filter((r) => r.status === "fulfilled" && r.value).length;

  return NextResponse.json({ ok: true, dmSent });
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/projects/
git commit -m "feat: add telegram send route for manual callsheet dispatch"
```

---

## Task 6: Cron 자동 발송 + `vercel.json`

**Files:**
- Create: `src/app/api/cron/telegram-callsheet/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Cron 라우트 생성**

```typescript
// src/app/api/cron/telegram-callsheet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { CallSheetPDF } from "@/components/call-sheet-pdf";
import {
  sendMessage,
  sendDocument,
  buildCallsheetMessage,
  buildDmMessage,
} from "@/lib/telegram";

// GET /api/cron/telegram-callsheet
// Vercel Cron: 매일 UTC 10:00 (KST 19:00)
// 내일 촬영일 + telegramChatId 있는 프로젝트에 콜시트 발송
export async function GET(req: NextRequest) {
  // CRON_SECRET 검증
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  // 내일 날짜의 촬영일 조회 (telegramChatId 있는 프로젝트만)
  const shootingDays = await db.shootingDay.findMany({
    where: {
      date: { gte: tomorrow, lt: dayAfter },
      schedule: {
        project: { telegramChatId: { not: null } },
      },
      callSheets: { some: {} }, // 콜시트 있는 것만
    },
    include: {
      schedule: {
        include: {
          project: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, name: true, telegramChatId: true } },
                },
              },
            },
          },
        },
      },
      sceneStatuses: {
        include: {
          scene: { include: { characters: { include: { character: true } } } },
        },
        orderBy: { scene: { number: "asc" } },
      },
      callSheets: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const results: { dayId: string; ok: boolean; error?: string }[] = [];

  for (const day of shootingDays) {
    try {
      const project = day.schedule.project;
      if (!project.telegramChatId) continue;

      // 촬영일 번호 계산
      const allDays = await db.shootingDay.findMany({
        where: { scheduleId: day.scheduleId },
        orderBy: { date: "asc" },
        select: { id: true },
      });
      const dayNumber = allDays.findIndex((d) => d.id === day.id) + 1;

      // 공유 링크 생성
      let shareUrl = `${appUrl}/projects/${project.id}/schedule/${day.scheduleId}/day/${day.id}`;
      if (day.callSheets[0]) {
        const share = await db.callSheetShare.create({
          data: {
            callSheetId: day.callSheets[0].id,
            shootingDayId: day.id,
            expiresAt: new Date(day.date.getTime() + 24 * 60 * 60 * 1000),
          },
        });
        shareUrl = `${appUrl}/c/${share.token}`;
      }

      const sceneNumbers = day.sceneStatuses.map((s) => s.scene.number);
      const groupMessage = buildCallsheetMessage({
        projectTitle: project.title,
        dayNumber,
        date: day.date,
        location: day.location,
        callTime: day.callTime,
        shootTime: day.shootTime,
        sceneNumbers,
        shareUrl,
      });

      await sendMessage(project.telegramChatId, groupMessage);

      // PDF 발송
      if (day.callSheets[0]) {
        try {
          const pdfBuffer = await renderToBuffer(
            React.createElement(CallSheetPDF, {
              day,
              project: { title: project.title },
              scheduleId: day.scheduleId,
            })
          );
          await sendDocument(
            project.telegramChatId,
            Buffer.from(pdfBuffer),
            `D+${dayNumber}_콜시트.pdf`,
            `${project.title} D+${dayNumber} 콜시트`
          );
        } catch (pdfErr) {
          console.error(`[cron] PDF 생성 실패 dayId=${day.id}:`, pdfErr);
        }
      }

      // 개인 DM 발송
      await Promise.allSettled(
        project.members
          .filter((m) => m.user.telegramChatId)
          .map((m) =>
            sendMessage(
              m.user.telegramChatId!,
              buildDmMessage({
                memberName: m.user.name,
                date: day.date,
                shareUrl,
              })
            )
          )
      );

      results.push({ dayId: day.id, ok: true });
    } catch (err) {
      console.error(`[cron] 발송 실패 dayId=${day.id}:`, err);
      results.push({ dayId: day.id, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
```

- [ ] **Step 2: `vercel.json` 생성 (프로젝트 루트)**

```json
{
  "crons": [
    {
      "path": "/api/cron/telegram-callsheet",
      "schedule": "0 10 * * *"
    }
  ]
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/cron/ vercel.json
git commit -m "feat: add telegram cron route for daily callsheet auto-send (KST 19:00)"
```

---

## Task 7: 스케줄 변경 알림 라우트 + 촬영일 PATCH 연동

**Files:**
- Create: `src/app/api/projects/[id]/telegram/notify/route.ts`
- Modify: `src/app/api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/route.ts`

- [ ] **Step 1: notify 라우트 생성**

```typescript
// src/app/api/projects/[id]/telegram/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMessage, buildNotifyMessage, NotifyChangeType } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/telegram/notify
// Body: { dayId: string, changeType: "LOCATION"|"CALLTIME"|"WEATHER", oldValue: string, newValue: string }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const { dayId, changeType, oldValue, newValue } = await req.json() as {
    dayId: string;
    changeType: NotifyChangeType;
    oldValue: string;
    newValue: string;
  };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { telegramChatId: true, schedules: { select: { shootingDays: { where: { id: dayId }, select: { id: true }, orderBy: { date: "asc" } }, orderBy: { createdAt: "asc" } } } },
  });

  if (!project?.telegramChatId) {
    return NextResponse.json({ ok: false, reason: "no_telegram" });
  }

  // 촬영일 번호 계산
  const scheduleId = project.schedules.find((s) =>
    s.shootingDays.some((d) => d.id === dayId)
  );
  let dayNumber = 0;
  if (scheduleId) {
    const allDays = await db.shootingDay.findMany({
      where: { scheduleId: scheduleId.shootingDays[0]?.id ? undefined : undefined, schedule: { projectId } },
      orderBy: { date: "asc" },
      select: { id: true },
    });
    dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;
  }

  const message = buildNotifyMessage(dayNumber, changeType, oldValue, newValue);
  const sent = await sendMessage(project.telegramChatId, message);

  return NextResponse.json({ ok: sent });
}
```

**Note:** The dayNumber calculation above is simplified. The implementer should query it properly by finding the schedule the day belongs to and getting its ordered list.

Better implementation for the notify route dayNumber:

```typescript
// More accurate dayNumber calculation
const day = await db.shootingDay.findUnique({
  where: { id: dayId },
  select: { scheduleId: true },
});
if (!day) return NextResponse.json({ error: "촬영일 없음" }, { status: 404 });

const allDays = await db.shootingDay.findMany({
  where: { scheduleId: day.scheduleId },
  orderBy: { date: "asc" },
  select: { id: true },
});
const dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;
```

Use this corrected version. Full corrected notify route:

```typescript
// src/app/api/projects/[id]/telegram/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMessage, buildNotifyMessage, NotifyChangeType } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const body = await req.json() as {
    dayId: string;
    changeType: NotifyChangeType;
    oldValue: string;
    newValue: string;
  };
  const { dayId, changeType, oldValue, newValue } = body;

  const [project, day] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: { telegramChatId: true },
    }),
    db.shootingDay.findUnique({
      where: { id: dayId },
      select: { scheduleId: true },
    }),
  ]);

  if (!project?.telegramChatId) {
    return NextResponse.json({ ok: false, reason: "no_telegram" });
  }
  if (!day) return NextResponse.json({ error: "촬영일 없음" }, { status: 404 });

  const allDays = await db.shootingDay.findMany({
    where: { scheduleId: day.scheduleId },
    orderBy: { date: "asc" },
    select: { id: true },
  });
  const dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;

  const message = buildNotifyMessage(dayNumber, changeType, oldValue, newValue);
  const sent = await sendMessage(project.telegramChatId, message);

  return NextResponse.json({ ok: sent });
}
```

- [ ] **Step 2: 촬영일 PATCH 라우트에 알림 트리거 추가**

`src/app/api/projects/[id]/schedules/[scheduleId]/shooting-days/[dayId]/route.ts`의 PATCH 함수를 읽은 뒤 확인 — `location`이나 `callTime` 필드가 변경될 때 notify API를 내부적으로 호출한다. 외부 fetch 대신 알림 로직을 직접 호출한다.

PATCH 함수 내에서 update 전 이전 값과 이후 값을 비교해서 변경이 있을 때만 알림:

```typescript
// 기존 PATCH 함수 내에서 (shooting-days/[dayId]/route.ts)
// db.shootingDay.update 호출 전에 현재 값 조회:
const currentDay = await db.shootingDay.findUnique({
  where: { id: dayId },
  select: { location: true, callTime: true },
});

// update 후:
const updated = await db.shootingDay.update({ ... });

// 텔레그램 알림 (비동기, 실패해도 응답에 영향 없음)
const { sendMessage, buildNotifyMessage } = await import("@/lib/telegram");
const project = await db.project.findUnique({
  where: { id },  // id = projectId
  select: { telegramChatId: true },
});

if (project?.telegramChatId) {
  const allDays = await db.shootingDay.findMany({
    where: { scheduleId },
    orderBy: { date: "asc" },
    select: { id: true },
  });
  const dayNumber = allDays.findIndex((d) => d.id === dayId) + 1;

  if (body.location && currentDay?.location && body.location !== currentDay.location) {
    sendMessage(
      project.telegramChatId,
      buildNotifyMessage(dayNumber, "LOCATION", currentDay.location, body.location)
    ).catch(console.error);
  }
  if (body.callTime && currentDay?.callTime && body.callTime !== currentDay.callTime) {
    sendMessage(
      project.telegramChatId,
      buildNotifyMessage(dayNumber, "CALLTIME", currentDay.callTime, body.callTime)
    ).catch(console.error);
  }
}
```

이 코드를 기존 PATCH 함수 안의 적절한 위치에 삽입한다. (read → update → notify 순서)

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/projects/
git commit -m "feat: add telegram notify route and wire schedule change alerts"
```

---

## Task 8: 프로젝트 설정 — 텔레그램 그룹 Chat ID

**Files:**
- Modify: `src/app/api/projects/[id]/route.ts` (PATCH에 telegramChatId 추가)
- Create: `src/components/telegram-settings-form.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: PATCH 라우트에 telegramChatId 처리 추가**

`src/app/api/projects/[id]/route.ts`의 PATCH 함수 `data` 객체에 추가:

```typescript
...(body.telegramChatId !== undefined && {
  telegramChatId: body.telegramChatId?.trim() || null,
}),
```

- [ ] **Step 2: TelegramSettingsForm 클라이언트 컴포넌트 생성**

```typescript
// src/components/telegram-settings-form.tsx
"use client";

import { useState } from "react";

interface Props {
  projectId: string;
  initialChatId?: string | null;
}

export function TelegramSettingsForm({ projectId, initialChatId }: Props) {
  const [chatId, setChatId] = useState(initialChatId ?? "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramChatId: chatId || null }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "저장되었습니다." });
      } else {
        setMessage({ type: "error", text: "저장 실패" });
      }
    } catch {
      setMessage({ type: "error", text: "저장 중 오류 발생" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!chatId) return;
    setTesting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/telegram/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "테스트 메시지를 발송했습니다. 텔레그램을 확인해 주세요." });
      } else {
        setMessage({ type: "error", text: "테스트 발송 실패" });
      }
    } catch {
      setMessage({ type: "error", text: "오류 발생" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          텔레그램 그룹 Chat ID
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="-1001234567890"
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !chatId}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? "발송 중…" : "테스트 메시지"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          텔레그램 그룹에 @raw_data_bot 초대 후 메시지 발송 → chat_id 복사
        </p>
      </div>
      {message && (
        <p className={`text-xs ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 테스트 메시지 API 라우트 생성**

```typescript
// src/app/api/projects/[id]/telegram/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMessage } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: projectId } = await params;
  const { chatId } = await req.json() as { chatId: string };

  if (!chatId) return NextResponse.json({ error: "chatId 필수" }, { status: 400 });

  const sent = await sendMessage(
    chatId,
    `✅ 프로덕션 파이프라인 시스템과 연결되었습니다. 프로젝트 ID: ${projectId}`
  );

  if (sent) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "발송 실패. BOT_TOKEN 또는 Chat ID를 확인해 주세요." }, { status: 500 });
}
```

- [ ] **Step 4: 프로젝트 대시보드 페이지에 텔레그램 섹션 추가**

`src/app/(dashboard)/projects/[id]/page.tsx` 파일을 읽어 최하단 섹션 뒤에 추가:

```tsx
// page.tsx의 상단 import에 추가:
import { TelegramSettingsForm } from "@/components/telegram-settings-form";

// project 쿼리에 telegramChatId 추가 (include 내부):
// db.project.findUnique({ where: { id }, select: { ..., telegramChatId: true, ... } })
// 또는 기존 include를 수정해서 telegramChatId가 조회되도록

// JSX 하단에 섹션 추가 (다른 섹션과 같은 패턴으로):
<section className="rounded-lg border border-gray-200 bg-white p-5">
  <h2 className="mb-4 text-sm font-semibold text-gray-900">텔레그램 설정</h2>
  <TelegramSettingsForm
    projectId={id}
    initialChatId={project.telegramChatId}
  />
</section>
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/projects/[id]/route.ts src/components/telegram-settings-form.tsx src/app/api/projects/[id]/telegram/ src/app/(dashboard)/projects/[id]/page.tsx
git commit -m "feat: add telegram group settings UI and PATCH support"
```

---

## Task 9: 팀 디렉토리 페이지 — 텔레그램 연결 상태

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/team/page.tsx`
- Create: `src/components/telegram-link-button.tsx`

**Note:** PR #1 (팀 디렉토리 전체 구현)이 이미 머지된 경우 기존 team 페이지에 텔레그램 컬럼만 추가한다. 머지 안 된 경우 새 페이지를 생성한다.

- [ ] **Step 1: TelegramLinkButton 클라이언트 컴포넌트 생성**

```typescript
// src/components/telegram-link-button.tsx
"use client";

import { useState } from "react";

interface Props {
  userId: string;
  isLinked: boolean;
}

export function TelegramLinkButton({ userId, isLinked }: Props) {
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isLinked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
        텔레그램 연결됨
      </span>
    );
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/telegram-link`, {
        method: "POST",
      });
      if (res.ok) {
        const { deepLink: link } = await res.json();
        setDeepLink(link);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!deepLink) return;
    await navigator.clipboard.writeText(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (deepLink) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-[200px] truncate rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
          {deepLink}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs text-blue-700 hover:underline"
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      📱 {loading ? "생성 중…" : "텔레그램 연결"}
    </button>
  );
}
```

- [ ] **Step 2: 팀 디렉토리 페이지 생성**

```tsx
// src/app/(dashboard)/projects/[id]/team/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TelegramLinkButton } from "@/components/telegram-link-button";

const ROLE_LABELS: Record<string, string> = {
  PD: "PD/연출",
  AD: "조감독/PM",
  ART_DIRECTOR: "프로덕션 디자이너",
  STAFF: "스태프",
  ADMIN: "관리자",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!project) notFound();

  const members = await db.projectMember.findMany({
    where: { projectId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          telegramChatId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">팀 디렉토리</h1>
        <p className="text-sm text-gray-500 mt-0.5">{project.title}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">이름</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">역할</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">이메일</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">텔레그램</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{m.user.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {ROLE_LABELS[m.role] ?? m.role}
                </td>
                <td className="px-4 py-3 text-gray-500">{m.user.email}</td>
                <td className="px-4 py-3">
                  <TelegramLinkButton
                    userId={m.user.id}
                    isLinked={!!m.user.telegramChatId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            등록된 팀원이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 레이아웃 네비게이션에 팀 탭 추가 (선택사항)**

`src/app/(dashboard)/projects/[id]/layout.tsx`를 확인해서 팀 페이지 링크가 없으면 추가한다.

- [ ] **Step 4: 커밋**

```bash
git add src/app/(dashboard)/projects/[id]/team/ src/components/telegram-link-button.tsx
git commit -m "feat: add team directory page with telegram link status"
```

---

## Task 10: 촬영일 상세 — 텔레그램 발송 버튼

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/telegram-send-button.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx`

- [ ] **Step 1: TelegramSendButton 클라이언트 컴포넌트 생성**

```typescript
// src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/telegram-send-button.tsx
"use client";

import { useState } from "react";

interface Props {
  projectId: string;
  scheduleId: string;
  dayId: string;
  hasTelegramGroup: boolean;
}

export function TelegramSendButton({ projectId, scheduleId, dayId, hasTelegramGroup }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!hasTelegramGroup) {
    return (
      <button
        disabled
        title="프로젝트 설정에서 텔레그램 그룹을 연결해 주세요"
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
      >
        텔레그램 발송
      </button>
    );
  }

  async function handleSend() {
    setStatus("sending");
    try {
      const res = await fetch(`/api/projects/${projectId}/telegram/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId, scheduleId }),
      });
      if (res.ok) {
        setStatus("sent");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        const data = await res.json();
        alert(data.error ?? "발송 실패");
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const labels: Record<typeof status, string> = {
    idle: "텔레그램 발송 ▶",
    sending: "발송 중…",
    sent: "발송 완료! ✓",
    error: "발송 실패",
  };

  return (
    <button
      onClick={handleSend}
      disabled={status === "sending"}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        status === "sent"
          ? "border-green-300 bg-green-50 text-green-700"
          : status === "error"
          ? "border-red-300 bg-red-50 text-red-700"
          : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
      }`}
    >
      {labels[status]}
    </button>
  );
}
```

- [ ] **Step 2: 촬영일 상세 페이지에 버튼 추가**

`src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/page.tsx`를 수정:

1. 상단 import에 추가:
```typescript
import { TelegramSendButton } from "./telegram-send-button";
```

2. `project`를 조회할 때 `telegramChatId` 포함:
```typescript
const project = await db.project.findUnique({
  where: { id },
  select: { title: true, telegramChatId: true },
});
```

3. PDF 버튼 옆에 TelegramSendButton 추가 (헤더 버튼 영역):
```tsx
{/* 기존 콜시트 PDF 버튼 바로 뒤에 */}
<TelegramSendButton
  projectId={id}
  scheduleId={scheduleId}
  dayId={dayId}
  hasTelegramGroup={!!project.telegramChatId}
/>
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/(dashboard)/projects/[id]/schedule/[scheduleId]/day/[dayId]/
git commit -m "feat: add telegram send button to shooting day detail page"
```

---

## Task 11: 단위 테스트

**Files:**
- Create: `src/test/telegram.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/test/telegram.test.ts
import { describe, it, expect } from "vitest";
import {
  buildCallsheetMessage,
  buildDmMessage,
  buildNotifyMessage,
  parseTelegramUpdate,
} from "@/lib/telegram";

describe("buildCallsheetMessage", () => {
  const base = {
    projectTitle: "한강 프로젝트",
    dayNumber: 3,
    date: new Date("2026-04-15T00:00:00+09:00"),
    location: "서울 마포구 합정동",
    callTime: "06:00",
    shootTime: "08:00",
    sceneNumbers: [3, 7, 12],
    shareUrl: "https://example.com/c/abc123",
  };

  it("프로젝트명과 D+N이 포함된다", () => {
    const msg = buildCallsheetMessage(base);
    expect(msg).toContain("한강 프로젝트 D+3 콜시트");
  });

  it("씬 번호가 S 접두사로 나열된다", () => {
    const msg = buildCallsheetMessage(base);
    expect(msg).toContain("씬: S3, S7, S12 (총 3씬)");
  });

  it("공유 링크가 포함된다", () => {
    const msg = buildCallsheetMessage(base);
    expect(msg).toContain("https://example.com/c/abc123");
  });

  it("호출/촬영 시간이 포함된다", () => {
    const msg = buildCallsheetMessage(base);
    expect(msg).toContain("호출 06:00 / 촬영 08:00");
  });

  it("날씨 정보가 있으면 포함된다", () => {
    const msg = buildCallsheetMessage({ ...base, tempMax: 12, tempMin: 6 });
    expect(msg).toContain("12°C / 6°C");
  });

  it("날씨 정보가 없으면 날씨 줄이 빠진다", () => {
    const msg = buildCallsheetMessage(base);
    expect(msg).not.toContain("°C");
  });

  it("씬 없으면 '씬: 미정' 표시", () => {
    const msg = buildCallsheetMessage({ ...base, sceneNumbers: [] });
    expect(msg).toContain("씬: 미정");
  });
});

describe("buildDmMessage", () => {
  it("팀원 이름이 포함된다", () => {
    const msg = buildDmMessage({
      memberName: "홍길동",
      date: new Date("2026-04-15"),
      shareUrl: "https://example.com/c/xyz",
    });
    expect(msg).toContain("홍길동님");
  });

  it("공유 링크가 포함된다", () => {
    const msg = buildDmMessage({
      memberName: "홍길동",
      date: new Date("2026-04-15"),
      shareUrl: "https://example.com/c/xyz",
    });
    expect(msg).toContain("https://example.com/c/xyz");
  });
});

describe("buildNotifyMessage", () => {
  it("장소 변경 메시지 형식", () => {
    const msg = buildNotifyMessage(5, "LOCATION", "합정동", "상암동");
    expect(msg).toBe("📢 [D+5] 장소 변경: 합정동 → 상암동");
  });

  it("콜타임 변경 메시지 형식", () => {
    const msg = buildNotifyMessage(5, "CALLTIME", "06:00", "07:00");
    expect(msg).toBe("⏰ [D+5] 콜타임 변경: 06:00 → 07:00");
  });

  it("날씨 변경 메시지 형식", () => {
    const msg = buildNotifyMessage(5, "WEATHER", "맑음", "비 (강수확률 80%)");
    expect(msg).toBe("⚠️ [D+5] 촬영지 날씨 변경: 맑음 → 비 (강수확률 80%)");
  });
});

describe("parseTelegramUpdate", () => {
  it("유효한 /start 메시지 파싱", () => {
    const body = {
      message: {
        from: { id: 123456789 },
        text: "/start ABC123",
      },
    };
    const result = parseTelegramUpdate(body);
    expect(result).toEqual({ chatId: 123456789, text: "/start ABC123" });
  });

  it("message 없으면 null", () => {
    expect(parseTelegramUpdate({ update_id: 1 })).toBeNull();
  });

  it("from.id 없으면 null", () => {
    const body = { message: { text: "/start ABC" } };
    expect(parseTelegramUpdate(body)).toBeNull();
  });

  it("text 없으면 null", () => {
    const body = { message: { from: { id: 123 } } };
    expect(parseTelegramUpdate(body)).toBeNull();
  });

  it("null 입력이면 null", () => {
    expect(parseTelegramUpdate(null)).toBeNull();
  });

  it("비문자열 입력이면 null", () => {
    expect(parseTelegramUpdate(42)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd /Users/daniel/dev/antigravity-dev/nunionda
bunx vitest run src/test/telegram.test.ts
```

Expected: FAIL (telegram.ts 아직 없음)

- [ ] **Step 3: Task 2가 완료된 상태이므로 테스트 통과 확인**

```bash
bunx vitest run src/test/telegram.test.ts
```

Expected: 전체 PASS (15+ tests)

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
bunx vitest run
```

Expected: 기존 + 신규 테스트 모두 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/test/telegram.test.ts
git commit -m "test: add unit tests for telegram message format functions"
```

---

## Self-Review Checklist

**스펙 커버리지:**
- ✅ DB: User.telegramChatId, User.telegramLinkCode, Project.telegramChatId (Task 1)
- ✅ telegram.ts: sendMessage, sendDocument, setWebhook (Task 2)
- ✅ telegram-link route: 6자리 코드 생성 + 딥링크 반환 (Task 3)
- ✅ webhook route: /start 파싱 + chatId 저장 (Task 4)
- ✅ 수동 발송: 그룹 메시지 + PDF + 개인 DM (Task 5)
- ✅ 자동 발송: Cron KST 19:00 (Task 6)
- ✅ vercel.json Cron 설정 (Task 6)
- ✅ 스케줄 변경 알림 (Task 7)
- ✅ 프로젝트 설정 UI: Chat ID 입력 + 저장 + 테스트 (Task 8)
- ✅ 팀 디렉토리 UI: 텔레그램 연결 상태 + 딥링크 버튼 (Task 9)
- ✅ 촬영일 상세 버튼: "텔레그램 발송 ▶" (Task 10)
- ✅ 단위 테스트: buildCallsheetMessage, parseTelegramUpdate 등 (Task 11)
- ✅ .env.example 업데이트 (Task 3)

**누락 항목:**
- `setWebhook`은 구현했지만 초기 등록 방법(어디서 호출하는지)을 문서화하지 않았음. → 배포 후 수동으로 `/api/telegram/webhook` URL로 `setWebhook` 호출 필요. 별도 npm script 또는 `/api/setup/webhook` 라우트를 만드는 것이 권장이지만 이 계획의 범위에서는 README 노트로 충분.

**타입 일관성:**
- `CallsheetMessageData.sceneNumbers: number[]` → Task 5, 6에서 `day.sceneStatuses.map((s) => s.scene.number)` 사용 (number) ✅
- `NotifyChangeType` → Task 7 notify 라우트에서 동일 타입 import ✅
- `TelegramUpdate` → Task 4 webhook에서 `parseTelegramUpdate` 반환값 사용 ✅
