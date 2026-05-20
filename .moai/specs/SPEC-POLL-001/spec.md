---
id: SPEC-POLL-001
version: "1.0.0"
status: draft
created: "2026-04-13"
updated: "2026-04-13"
author: MoAI
priority: high
issue_number: 0
---

# SPEC-POLL-001: 주기적 데이터 폴링 시스템

## HISTORY

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-04-13 | 1.0.0 | 최초 작성 | MoAI |

---

## 1. 개요

### 1.1 목적
주식 관심종목 대시보드의 데이터를 주기적으로 자동 갱신하는 폴링 시스템을 구현하여, 사용자가 수동 새로고침 없이 실시간에 가까운 시세 변동을 확인할 수 있도록 한다.

### 1.2 배경
현재 시스템은 StockCard 컴포넌트에서만 `setInterval`로 5분마다 폴링하고 있으며, 시장 지수나 차트 데이터는 자동 갱신되지 않는다. 또한 장이 닫힌 시간에도 동일한 인터벌로 폴링하여 불필요한 API 호출이 발생한다.

### 1.3 범위
- 프론트엔드 SWR 기반 데이터 유형별 동적 폴링
- 장시간 감지 (정규장/장전/장후/폐장/주말)
- 배치 종목 조회 API로 키움 API 호출 최적화
- 서버 캐시 TTL과 클라이언트 폴링 인터벌 정합성 확보

---

## 2. 기능 요구사항

### REQ-POLL-001: 장시간 감지 유틸리티
**우선순위**: High | **EARS 유형**: Ubiquitous

> The system shall determine the current market state and return data-type-specific polling intervals based on the market state.

`src/lib/market-hours.ts` 신규 생성:

**MarketState 타입**:
- `open`: 정규장 (09:00~15:30 평일)
- `pre-market`: 장전 (08:30~09:00 평일)
- `post-market`: 장후 (15:30~16:00 평일)
- `closed`: 폐장 (그 외 모든 시간, 주말 포함)

**getPollingInterval(dataType, marketState)**: 각 데이터 유형별 장 상태에 따른 인터벌(ms) 반환:

| dataType | open | pre/post | closed | 주말 |
|----------|------|----------|--------|------|
| stock-price | 15000 | 300000 | 3600000 | 0 (중지) |
| market-index | 30000 | 300000 | 3600000 | 0 (중지) |
| minute-chart | 60000 | 1800000 | 0 (중지) | 0 (중지) |
| daily-chart | 300000 | 3600000 | 43200000 | 43200000 |
| weekly-chart | 43200000 | 43200000 | 86400000 | 86400000 |
| exchange-rate | 3600000 | 14400000 | 43200000 | 43200000 |
| news | 900000 | 3600000 | 3600000 | 3600000 |

---

### REQ-POLL-002: 배치 종목 조회 API
**우선순위**: High | **EARS 유형**: State-Based

> When the frontend requests stock data for multiple symbols, the system shall batch-process the request to minimize Kiwoom API calls.

`src/app/api/stocks/batch/route.ts` 신규 생성:

**엔드포인트**: `POST /api/stocks/batch`

**요청**:
```typescript
interface BatchRequest {
  symbols: string[] // 최대 30개
}
```

**응답**:
```typescript
interface BatchResponse {
  data: Record<string, StockData>
  fetchedAt: string // ISO timestamp
}
```

**동작**:
1. symbols 배열에서 캐시에 없거나 만료된 종목만 필터링
2. 키움 API ka10001 병렬 조회 (캐시 미스 종목만)
3. 결과를 캐시에 저장 (TTL: 15초)
4. 캐시 히트 + 신규 조회 결과 병합 반환

**제약**:
- 최대 30종목까지 한 번에 요청 가능
- 초과 시 400 에러 반환
- 병렬 조회 시 동시 요청 수 제한 (5개씩 청크)

---

### REQ-POLL-003: 동적 폴링 커스텀 훅
**우선순위**: High | **EARS 유형**: Ubiquitous

> The system shall provide a usePollingData hook that automatically adjusts polling intervals based on market state and data type.

`src/hooks/usePollingData.ts` 신규 생성:

```typescript
type DataType = 'stock-price' | 'market-index' | 'minute-chart' |
                'daily-chart' | 'weekly-chart' | 'exchange-rate' | 'news'

function usePollingData<T>(
  key: string,
  fetcher: () => Promise<T>,
  dataType: DataType
): {
  data: T | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  marketState: MarketState
  isPolling: boolean // 인터벌 > 0일 때 true
}
```

**동작**:
1. `getMarketState()`로 현재 장 상태 확인
2. `getPollingInterval(dataType, marketState)`로 인터벌 획득
3. SWR `refreshInterval`에 동적 인터벌 설정
4. 인터벌이 0이면 폴링 비활성화 (초기 로드만 수행)
5. 장 상태 변화 감지 시 인터벌 자동 업데이트

**장 상태 확인 주기**: 60초마다 장 상태 재확인

---

### REQ-POLL-004: 서버 캐시 TTL 정합성
**우선순위**: Medium | **EARS 유형**: Required

> The system shall ensure server cache TTL does not exceed client polling interval to prevent stale cache hits during polling.

`src/lib/cache.ts` 수정:

| 데이터 유형 | 기존 TTL | 변경 TTL | 사유 |
|------------|---------|---------|------|
| 주가 상세 | 30초 | **15초** | 클라이언트 15초 폴링에 맞춤 |
| 시장 지수 | 60초 | **30초** | 클라이언트 30초 폴링에 맞춤 |

**규칙**: `서버 TTL ≤ 클라이언트 폴링 인터벌` 항상 성립해야 함

---

### REQ-POLL-005: 기존 컴포넌트 폴링 통합
**우선순위**: High | **EARS 유형**: Migration

> The system shall replace existing setInterval-based polling in StockCard with the new usePollingData hook and add polling to MarketIndicators.

**StockCard.tsx 변경사항**:
- `setInterval` 제거
- `usePollingData('stock-price')`로 전환
- 배치 조회 엔드포인트 활용 (관심종목 전체)

**MarketIndicators.tsx 변경사항**:
- 기존 `useSWR` → `usePollingData('market-index')` 전환
- 환율 탭 → `usePollingData('exchange-rate')` 추가

---

## 3. 비기능 요구사항

### NFR-POLL-001: API 호출 한도 준수
키움 API 100회/분 한도 내에서 안전하게 운영되어야 한다.
- 배치 조회로 관심종목 20개 기준 7회/분 이하 유지
- Rate limiter 로깅으로 호출 빈도 모니터링

### NFR-POLL-002: 장외 시간 최적화
장이 닫힌 시간에는 API 호출을 최소화해야 한다.
- 주말: 실시간 데이터 폴링 완전 중지
- 폐장: 최대 1시간 인터벌 또는 중지
- 장 전환 시 부드러운 인터벌 변경 (즉시 반영)

### NFR-POLL-003: 기존 기능 무영향
폴링 시스템 도입으로 기존 수동 새로고침, 검색, 차트 기능이 영향을 받지 않아야 한다.

---

## 4. 제외 항목 (What NOT to Build)

- WebSocket 실시간 연결 (과도한 엔지니어링, 소규모에 불필요)
- Redis 분산 캐시 (단일 프로세스에 불필요)
- node-cron 서버 스케줄링 (Phase 2 고려사항)
- 한국 공휴일 API 연동 (초기 버전은 주말만 감지)
- 프로그레시브 웹 앱 푸시 알림
- 알림 설정 UI (가격 알림 등)
- 실시간 호가/체결 데이터

---

## 5. 영향받는 파일

### [NEW] src/lib/market-hours.ts
- 장시간 감지 유틸리티 (getMarketState, getPollingInterval)

### [NEW] src/app/api/stocks/batch/route.ts
- 배치 종목 조회 API 엔드포인트

### [NEW] src/hooks/usePollingData.ts
- 동적 폴링 커스텀 훅

### [MODIFY] src/lib/cache.ts
- 주가 TTL: 30초 → 15초
- 지수 TTL: 60초 → 30초

### [MODIFY] src/components/dashboard/StockCard.tsx
- setInterval → usePollingData 전환

### [MODIFY] src/components/dashboard/MarketIndicators.tsx
- SWR → usePollingData 전환

---

## 6. 의존성

- SWR v2 (이미 설치됨)
- 기존 키움 REST API 클라이언트 (src/lib/kiwoom-stock-api.ts)
- 기존 캐시 시스템 (src/lib/cache.ts)
- 기존 API 유틸 (src/lib/api.ts)

---

## 7. MX 태그 계획

| 타겟 | 태그 | 우선순위 |
|------|------|---------|
| getMarketState() | @MX:ANCHOR | P1 (다수 컴포넌트에서 호출) |
| getPollingInterval() | @MX:ANCHOR | P1 (모든 폴링 훅에서 호출) |
| usePollingData | @MX:NOTE | P2 (새 훅, 컨텍스트 설명) |
| batch route handler | @MX:NOTE | P2 (배치 조회 로직) |
| 캐시 TTL 상수 | @MX:NOTE | P3 (변경 이유 명시) |
