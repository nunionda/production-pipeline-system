# 텔레그램 봇 연동 설계

**날짜:** 2026-03-27
**상태:** 승인됨

---

## 목적

카카오톡 대신 텔레그램을 팀 커뮤니케이션 채널로 사용한다.
콜시트 공유 링크 발송, PDF 첨부, 개인 확인 요청, 날씨/스케줄 변경 알림을 모두 텔레그램으로 처리한다.

---

## 아키텍처

```
텔레그램 Bot API
    ↕ webhook
POST /api/telegram/webhook  ← Bot 수신 (팀원 /start 연결)
src/lib/telegram.ts         ← sendMessage, sendDocument 래퍼

프로젝트 설정 → Project.telegramChatId  (그룹 채팅)
팀원 연결     → User.telegramChatId + telegramLinkCode  (개인 DM)

수동 발송: 촬영일 상세 "텔레그램 발송" 버튼
자동 발송: GET /api/cron/telegram-callsheet (Vercel Cron, 매일 UTC 10:00 = KST 19:00)
알림 발송: 스케줄/날씨 변경 이벤트 → 그룹 알림
```

---

## 데이터 모델

### Prisma 변경 (`prisma/schema.prisma`)

```prisma
model User {
  // 기존 필드 유지
  telegramChatId   String?   // 개인 DM chat_id (봇과 연결 후 저장)
  telegramLinkCode String?   // /start 연결용 일회성 코드 (연결 완료 후 null)
}

model Project {
  // 기존 필드 유지
  telegramChatId   String?   // 그룹 채팅 chat_id
}
```

마이그레이션 1개, 신규 테이블 없음.

---

## 환경 변수

```env
TELEGRAM_BOT_TOKEN=          # BotFather에서 발급 (예: 123456789:AAF...)
TELEGRAM_WEBHOOK_SECRET=     # 임의 문자열, webhook X-Telegram-Bot-Api-Secret-Token 검증용
CRON_SECRET=                 # Cron 엔드포인트 외부 호출 차단용 (Authorization: Bearer <secret>)
NEXT_PUBLIC_APP_URL=         # https://yourdomain.com (딥링크 생성용)
```

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/lib/telegram.ts` | Bot API 래퍼 (sendMessage, sendDocument, setWebhook) |
| `src/app/api/telegram/webhook/route.ts` | POST — Bot 수신 처리 (/start 코드 파싱 → chatId 저장) |
| `src/app/api/projects/[id]/telegram/send/route.ts` | POST — 수동 콜시트 발송 |
| `src/app/api/cron/telegram-callsheet/route.ts` | GET — 자동 발송 Cron 엔드포인트 |
| `src/app/api/projects/[id]/telegram/notify/route.ts` | POST — 알림 발송 (날씨/스케줄 변경) |
| `src/app/api/users/[userId]/telegram-link/route.ts` | POST — 개인 딥링크 코드 생성 |
| `vercel.json` | Cron 설정 |

---

## Bot 연동 메커니즘

### 그룹 연결 (PD)

1. 프로젝트 설정 페이지 (`/projects/[id]/settings`) 에 "텔레그램 그룹 Chat ID" 입력 필드 추가
2. PD가 텔레그램 그룹에서 chat_id 조회 후 붙여넣기 → 저장
3. 저장 시 봇이 그룹에 "✅ [프로젝트명] 연결 완료" 메시지 발송으로 확인

### 개인 연결 (팀원)

1. 팀 디렉토리 페이지 (`/projects/[id]/team`) 에 각 팀원 행에 "텔레그램 연결" 버튼 표시
2. 클릭 → `POST /api/users/[userId]/telegram-link` → 6자리 랜덤 코드 생성 → `User.telegramLinkCode` 저장
3. 앱이 딥링크 표시: `t.me/<BOT_USERNAME>?start=<code>`
4. 팀원이 링크 클릭 → 텔레그램 봇 대화 시작
5. Webhook이 `/start <code>` 수신 → 코드로 User 조회 → `telegramChatId` 저장, `telegramLinkCode` null → "연결 완료!" 응답

### Webhook (`POST /api/telegram/webhook`)

```
수신: { message: { from: { id: chat_id }, text: "/start abc123" } }
처리:
  1. X-Telegram-Bot-Api-Secret-Token 헤더 검증
  2. text.startsWith("/start ") 확인
  3. 코드 추출 → db.user.findFirst({ where: { telegramLinkCode: code } })
  4. 찾으면: telegramChatId = chat_id, telegramLinkCode = null 로 업데이트
  5. sendMessage(chat_id, "✅ 연결 완료! 이제 콜시트 알림을 받을 수 있습니다.")
  6. 코드 없으면: sendMessage(chat_id, "올바르지 않은 코드입니다.")
항상 200 반환 (텔레그램 재전송 방지)
```

---

## 발송 콘텐츠

### 그룹 발송 (공지)

```
🎬 [프로젝트명] D+N 콜시트
📅 2026.04.15 (수)
📍 서울 마포구 합정동
⏰ 호출 06:00 / 촬영 08:00
🌤 12°C / 6°C  (날씨 데이터 있을 경우)

씬: S3, S7, S12 (총 3씬)

👉 콜시트 확인: https://.../c/<token>
```

PDF 파일은 `sendDocument`로 별도 첨부 (`application/pdf`, 파일명 `D+N_콜시트.pdf`).

### 개인 DM 발송 (확인 요청)

텔레그램 연결된 팀원에게만 발송:
```
안녕하세요 [이름]님,
내일([날짜]) 촬영 콜시트를 확인해 주세요.

👉 https://.../c/<token>

위 링크에서 이름 입력 시 확인 처리됩니다.
```

### 알림 메시지 (그룹)

| 이벤트 | 메시지 형식 |
|--------|------------|
| 날씨 급변 (강수확률 ≥60%) | `⚠️ [D+N] 촬영지 날씨 변경: 맑음 → 비 (강수확률 80%)` |
| 촬영일 장소 변경 | `📢 [D+N] 장소 변경: 합정동 → 상암동` |
| 촬영일 콜타임 변경 | `⏰ [D+N] 콜타임 변경: 06:00 → 07:00` |

**알림 트리거:**
- 장소/콜타임 변경: `PATCH /api/projects/.../shooting-days/[dayId]` 성공 직후 호출
- 날씨 알림: Cron과 동일 `GET /api/cron/telegram-callsheet` 실행 시 전날 이미 발송된 콜시트가 있는 촬영일에 대해 날씨를 재조회, 강수확률이 전날 대비 30%p 이상 증가 시 그룹에 경고 발송

---

## 수동 발송 UI

촬영일 상세 페이지 헤더 영역에 버튼 추가:

```
[콜시트 PDF]  [텔레그램 발송 ▶]
```

"텔레그램 발송" 클릭 →
1. `POST /api/projects/[id]/telegram/send` 호출
2. 그룹 메시지 + PDF 발송
3. 텔레그램 연결된 팀원 전원에게 개인 DM 발송
4. 버튼 상태: "발송 중…" → "발송 완료!" (2초 후 원상복귀)
5. 프로젝트에 `telegramChatId` 없으면: "텔레그램 그룹이 연결되지 않았습니다" 토스트

---

## 자동 발송 (Cron)

`vercel.json`:
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

매일 KST 19:00 (UTC 10:00) 실행:

1. 내일 날짜(`tomorrow`)의 `ShootingDay` 전체 조회
2. 각 촬영일의 프로젝트에 `telegramChatId` 있는 것만 필터링
3. 콜시트 있는 촬영일만 처리 (`callSheets` 최신 1개)
4. 그룹 메시지 + PDF 발송
5. 프로젝트 팀원 중 `telegramChatId` 있는 사람에게 개인 DM 발송
6. 실패한 발송은 console.error 로깅 (중단하지 않고 다음 촬영일 계속 처리)

Cron 엔드포인트는 `CRON_SECRET` 헤더 검증으로 외부 직접 호출 차단.

---

## 프로젝트 설정 페이지

기존 `/projects/[id]` 대시보드에 "텔레그램 설정" 섹션 추가:

```
텔레그램 그룹 Chat ID
[                    ] [저장]  [테스트 메시지 발송]

* 텔레그램 그룹에서 chat_id 확인 방법:
  그룹에 @raw_data_bot 초대 → 임의 메시지 발송 → chat_id 복사
```

---

## 팀 디렉토리 UI 변경

`/projects/[id]/team` 팀원 행에 텔레그램 연결 상태 추가:

```
홍길동  PD   010-1234-5678   [✅ 텔레그램 연결됨]
김철수  AD   010-9876-5432   [📱 텔레그램 연결]  ← 클릭 시 딥링크 팝업
```

연결 안 된 팀원: 딥링크 팝업 → `t.me/봇?start=코드` QR코드 또는 복사 버튼.

**권한:** 딥링크 생성(`POST /api/users/[userId]/telegram-link`)은 본인(`session.user.id === userId`) 또는 프로젝트 PD만 호출 가능.

---

## telegram.ts API 래퍼

```typescript
export async function sendMessage(chatId: string | number, text: string): Promise<boolean>
export async function sendDocument(chatId: string | number, buffer: Buffer, filename: string, caption?: string): Promise<boolean>
export async function setWebhook(url: string): Promise<boolean>
```

- 모든 함수 실패 시 false 반환 (throw 없음)
- `next: { revalidate: 0 }` — 캐싱 없음 (실시간 API 호출)

---

## 에러 처리

- `TELEGRAM_BOT_TOKEN` 없으면 모든 함수 false 반환
- 그룹 chat_id 없으면 발송 버튼 비활성화 + 안내 토스트
- 개인 DM 실패는 silent (그룹 발송은 계속 진행)
- Cron 실패는 console.error 기록 (전체 중단 없음)

---

## 테스트

`src/test/telegram.test.ts`:
- `buildCallsheetMessage(day, project)` — 메시지 포맷 순수 함수 단위 테스트
- `parseTelegramUpdate(body)` — webhook 파싱 순수 함수 테스트
