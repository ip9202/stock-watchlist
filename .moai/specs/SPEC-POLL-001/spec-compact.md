# SPEC-POLL-001 Compact

## 요구사항

### REQ-POLL-001: 장시간 감지 유틸리티
- `src/lib/market-hours.ts` 신규
- MarketState: open | pre-market | post-market | closed
- getPollingInterval(dataType, marketState): 인터벌(ms) 반환
- 장중 주가 15초, 지수 30초, 분봉 1분 / 주말 실시간 중지

### REQ-POLL-002: 배치 종목 조회 API
- `src/app/api/stocks/batch/route.ts` 신규
- POST /api/stocks/batch: symbols 배열 → 일괄 주가 조회
- 최대 30종목, 캐시 미스만 API 호출, TTL 15초

### REQ-POLL-003: 동적 폴링 커스텀 훅
- `src/hooks/usePollingData.ts` 신규
- SWR refreshInterval + 장시간 기반 동적 인터벌
- 인터벌 0이면 폴링 비활성화
- 60초마다 장 상태 재확인

### REQ-POLL-004: 서버 캐시 TTL 정합성
- src/lib/cache.ts 수정: 주가 TTL 30→15초, 지수 TTL 60→30초
- 서버 TTL ≤ 클라이언트 인터벌 규칙

### REQ-POLL-005: 기존 컴포넌트 폴링 통합
- StockCard.tsx: setInterval → usePollingData
- MarketIndicators.tsx: SWR → usePollingData

## Acceptance Criteria

- AC-001: 장시간별 getMarketState 정확성 (open/pre/post/closed)
- AC-002: 장 상태+데이터타입별 인터벌 반환
- AC-003: 배치 API (정상/빈배열/초과/캐시히트)
- AC-004: usePollingData 동적 인터벌 + 장 전환
- AC-005: 서버 TTL ≤ 클라이언트 인터벌
- AC-006: 기존 기능 무영향 (새로고침/검색/차트)
- AC-007: API 호출 ≤ 10회/분 (관심종목 20개 장중)

## 수정 파일

- [NEW] src/lib/market-hours.ts
- [NEW] src/app/api/stocks/batch/route.ts
- [NEW] src/hooks/usePollingData.ts
- [MODIFY] src/lib/cache.ts (TTL 조정)
- [MODIFY] src/components/dashboard/StockCard.tsx
- [MODIFY] src/components/dashboard/MarketIndicators.tsx

## 제외 항목

- WebSocket, Redis, node-cron, 공휴일 API, 푸시 알림, 호가/체결 데이터
