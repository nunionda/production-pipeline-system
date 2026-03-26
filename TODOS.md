# TODOS — nunionda

## P3: Deferred / Nice-to-Have

### SSE 멀티 인스턴스 대응 — Redis Pub/Sub
**What:** 현재 프로세스 글로벌 EventEmitter를 Redis Pub/Sub으로 교체
**Why:** 현재 구현은 단일 프로세스에서만 동작. 로드 밸런서 뒤에 2개 이상의 `next start` 프로세스를 실행하면 이벤트가 일부 클라이언트에 도달하지 않음
**Pros:** 수평 확장 가능, 멀티 인스턴스 배포 지원
**Cons:** Redis 인프라 추가 필요, 현재 단일 서버 환경에서는 불필요
**Context:** 현재 Docker + `next start` 단일 인스턴스 — 스케일업 전까지 불필요. Sprint 8c의 `lib/sse-emitter.ts`를 Redis Pub/Sub으로 교체.
**Effort:** M human / S CC+gstack
**Priority:** P3
**Depends on:** 멀티 인스턴스 배포 결정 후

### BudgetLine.actualAmount 컬럼 정리
**What:** `Expense` 모델이 완전히 채택된 후 `BudgetLine.actualAmount` 레거시 컬럼 제거
**Why:** Sprint 8d 이후 `actualAmount`는 바이패스됨 — 신규 지출은 `Expense` 모델로만 기록. 두 개의 진실 소스가 미래 개발자를 혼란시킬 수 있음
**Pros:** 스키마 명확화, 마이그레이션 부채 해소
**Cons:** 기존 `actualAmount` 데이터를 `Expense` 레코드로 백필하는 마이그레이션 필요
**Context:** 모든 BudgetLine이 Expense 레코드를 사용하고 있음을 확인한 후 실행. 현재 `actualAmount` 데이터는 초기 수동 입력값.
**Effort:** S human / S CC+gstack
**Priority:** P3
**Depends on:** Sprint 8d 완료 + 실제 사용 확인 후

### 날씨 API 연동
**What:** 기상청 또는 Open-Meteo API로 촬영일 날씨 예보 표시
**Why:** 야외 씬 촬영일에 날씨가 핵심 변수 — 콜시트에 날씨 포함 시 PD/조감독 의사결정 지원
**Pros:** 현장 실용성 높음, 외부 툴 탭 전환 불필요
**Cons:** API 키 관리, 위치 데이터 매핑 필요
**Context:** 기상청 API (국내 정확도 높음) 또는 Open-Meteo (무료, 한국 지원). 촬영 장소 좌표가 Location 모델에 없으면 지오코딩 필요.
**Effort:** M human / S CC+gstack
**Priority:** P3

### 스크립트 개정 버저닝 + diff 뷰
**What:** 시나리오 개정판 버전 관리 + 이전 버전 대비 변경 diff 뷰
**Why:** 현장에서 대본 변경이 잦음 — 배우가 어떤 대사가 바뀌었는지 빠르게 파악 필요
**Pros:** 대본 변경 추적, 현장 혼선 방지
**Cons:** diff 렌더링 복잡성, 버전 스토리지 증가
**Context:** 실제 사용 후 얼마나 자주 개정이 발생하는지 확인 후 결정.
**Effort:** M human / S CC+gstack
**Priority:** P3

### 팀 디렉토리 (부서별 연락처)
**What:** 부서별 스태프 연락처 목록 + PDF/Excel 내보내기
**Why:** 현재 카카오톡 단체방에 흩어진 연락처를 시스템에서 관리
**Pros:** 비상 연락처 한 곳 관리, 콜시트에 자동 포함 가능
**Cons:** 핵심 3개 기능 대비 우선순위 낮음
**Context:** ProjectMember 모델 이미 존재 — 전화번호 필드 추가 + 부서별 필터 뷰로 구현 가능.
**Effort:** S human / S CC+gstack
**Priority:** P3

### PWA Service Worker 오프라인 캐싱
**What:** 콜시트 + 라이브뷰 PWA 오프라인 지원
**Why:** 일부 촬영 현장은 인터넷이 불안정 — 콜시트를 오프라인에서도 볼 수 있어야 함
**Pros:** 오프라인 내성, 앱 설치 경험
**Cons:** Service Worker 복잡성, Next.js PWA 설정 필요
**Context:** 콜시트 링크 배포(8a) 이후 2단계. `next-pwa` 패키지 검토.
**Effort:** L human / M CC+gstack
**Priority:** P3
**Depends on:** Sprint 8a 완료 + 실제 사용 패턴 확인 후

### 카카오알림톡 / 문자 자동 발송
**What:** 콜시트 링크를 카카오알림톡 또는 SMS로 자동 발송
**Why:** 현재는 링크를 수동으로 복사해서 카카오톡에 붙여넣어야 함
**Pros:** 배포 마찰 제거, 진짜 카카오톡 대체
**Cons:** 카카오 비즈니스 채널 신청 + 알림톡 API 인증 복잡성, 비용 발생
**Context:** 카카오 알림톡 API (bizm.io 또는 직접 신청) 또는 Twilio SMS. 링크 배포(8a) 먼저 검증 후 자동화.
**Effort:** M human / S CC+gstack
**Priority:** P3
**Depends on:** Sprint 8a 실제 사용 확인 후

### AI 스케줄 어시스턴트
**What:** "씬 23 내일로 이동해" 같은 자연어 명령으로 스케줄 자동 조정 + 충돌 경고
**Why:** 스케줄 조정은 PD/조감독의 가장 고통스러운 반복 작업
**Pros:** 세상 최고의 조감독 AI — 10-star 비전의 핵심
**Cons:** 스케줄 최적화 로직 복잡성, AI 신뢰성 이슈
**Context:** 데이터 모델이 충분히 쌓인 후 (실제 촬영 데이터 필요). Claude API로 스케줄 데이터 → 자연어 명령 → 조정 제안 → 사용자 확인 플로우.
**Effort:** XL human / L CC+gstack
**Priority:** P3
**Depends on:** 실제 촬영 데이터 + 사용 패턴 축적 후
