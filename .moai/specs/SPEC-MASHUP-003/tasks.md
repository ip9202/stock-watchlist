## Task Decomposition
SPEC: SPEC-MASHUP-003

| Task ID | Description | Requirement | Dependencies | Planned Files | Status |
|---------|-------------|-------------|--------------|---------------|--------|
| T-001 | Types + API Client (stock-auto/client.ts) | REQ-001 | - | src/lib/stock-auto/client.ts, src/lib/stock-auto/__tests__/client.test.ts | pending |
| T-002 | Signal Proxy List Route | REQ-002 | T-001 | src/app/api/signals/route.ts, src/app/api/signals/__tests__/route.test.ts | pending |
| T-003 | Signal Proxy Individual Route | REQ-002 | T-001 | src/app/api/signals/[stockCode]/route.ts | pending |
| T-004 | SignalCard Component | REQ-003 | T-001 | src/components/signals/SignalCard.tsx | pending |
| T-005 | SignalPanel Component | REQ-004 | T-004 | src/components/signals/SignalPanel.tsx | pending |
| T-006 | Dashboard Integration | REQ-005 | T-005 | src/app/page.tsx | pending |

## User Decisions
- Polling: SWR 자동 갱신 60초 + 수동 새로고침
- Layout: 관심종목 하단 (WatchlistManager 아래)
- Colors: BUY=초록, SELL=빨강, HOLD=회색 (SPEC 지정)
- Cache TTL: 30초 (기존 시장 지수와 동일)
