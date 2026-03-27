# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0.0] - 2026-03-27

### Added
- **날씨 예보** — 촬영일 상세에 시간별 날씨 표시, 기상청(KMA) + Open-Meteo 이중 소스
- **팀 디렉토리** — 부서별 팀원 목록, 전화번호 수정, PDF/Excel 내보내기
- **텔레그램 봇 연동** — 콜시트 자동/수동 발송, 스케줄 변경 알림, 개인 DM, 웹훅 연동
- **콜시트 링크 배포** — 토큰 기반 공개 링크, 배우별 콜타임 강조, 확인 버튼
- **현장 라이브뷰** — SSE 기반 실시간 씬 상태 추적, 다크 테마, 48px 터치 타겟
- **DOOD (Day-out-of-Days)** — 인물×촬영일 매트릭스 페이지 + Excel 내보내기
- **SSE 이미터** — 프로세스 글로벌 EventEmitter로 실시간 이벤트 브로드캐스트
- **76개 유닛 테스트** — weather, team, telegram, callsheet, confirm, budget, dood, sse-emitter

### Changed
- 대시보드 예산 바가 Expense SUM을 사용 (기존 actualAmount 폴백 유지)
- DOOD 매트릭스 로직을 `lib/dood.ts`로 추출 (DRY 리팩토링)
- 라이브뷰 헤더에 촬영 장소 표시 추가

### Fixed
- 콜시트 공유 버튼 clipboard 쓰기 실패 시 무시 처리
- TelegramLinkButton 에러를 인라인으로 표시하여 재시도 가능
- 과거 날짜 날씨 예보 불필요 요청 방지
