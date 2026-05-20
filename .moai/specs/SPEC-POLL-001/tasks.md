## Task Decomposition
SPEC: SPEC-POLL-001
Development Mode: TDD

| Task ID | Description | Requirement | Dependencies | Planned Files | Status |
|---------|-------------|-------------|--------------|---------------|--------|
| T-001 | 장시간 감지 유틸리티 (MarketState + getPollingInterval) | REQ-POLL-001 | - | src/lib/market-hours.ts, src/lib/__tests__/market-hours.test.ts | pending |
| T-002 | 서버 캐시 TTL 조정 (주가 15초, 지수 30초) | REQ-POLL-004 | - | src/lib/cache.ts | pending |
| T-003 | 배치 종목 조회 API (POST /api/stocks/batch) | REQ-POLL-002 | T-002 | src/app/api/stocks/batch/route.ts, src/app/api/stocks/batch/__tests__/route.test.ts | pending |
| T-004 | SWR 폴링 커스텀 훅 (usePollingData) | REQ-POLL-003 | T-001 | src/hooks/usePollingData.ts, src/hooks/__tests__/usePollingData.test.ts | pending |
| T-005 | StockCard + MarketIndicators 폴링 통합 | REQ-POLL-005 | T-004, T-003 | src/components/dashboard/StockCard.tsx, src/components/dashboard/MarketIndicators.tsx | pending |
| T-006 | 폴링 설정 UI (OPTIONAL) | - | T-005 | src/components/dashboard/PollingSettings.tsx | deferred |
