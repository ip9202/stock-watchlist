# SPEC-CHART-001: 키움 REST API 차트 기능 구현

```yaml
id: SPEC-CHART-001
version: 1.0.0
status: completed
created: 2026-03-10
updated: 2026-03-10
completed: 2026-03-10
author: 강력쇠주먹
priority: high
tags: [chart, kiwoom-api, frontend, lightweight-charts]
```

## HISTORY

| 버전 | 날짜 | 작성자 | 변경사항 |
|------|------|--------|----------|
| 1.0.0 | 2026-03-10 | 강력쇠주먹 | 초기 SPEC 작성 |

---

## 1. Environment (환경)

### 프로젝트 컨텍스트
- **플랫폼**: Next.js 15 + TypeScript (App Router)
- **데이터 소스**: 키움증권 REST API (OAuth2 인증)
- **차트 라이브러리**: lightweight-charts (TradingView OSS, ~45KB)
- **기존 패턴**: SWR 데이터 페칭, 인메모리 캐시 (TTL 기반), Vitest 테스트
- **배포**: Docker + Railway

### 외부 API 명세
| api-id | 엔드포인트 | 설명 |
|--------|-----------|------|
| ka10081 | POST /api/dostk/chart | 주식일봉차트조회요청 |
| ka10082 | POST /api/dostk/chart | 주식주봉차트조회요청 |

### 페이지네이션 프로토콜
- `cont-yn` 응답 헤더: Y(추가 데이터 존재) / N(마지막 페이지)
- `next-key` 응답 헤더: 다음 페이지 조회 키
- 서버사이드 투명 누적 (최대 5회 자동 요청)

---

## 2. Assumptions (가정)

- A-001: 키움 REST API 차트 엔드포인트(`/api/dostk/chart`)가 ka10081/ka10082 api-id를 지원한다
- A-002: 차트 응답은 OHLCV(시가/고가/저가/종가/거래량) 필드를 포함한다
- A-003: 기존 `createHeaders()`, `parseSignedNumber()` 유틸리티를 차트 API에도 재사용할 수 있다
- A-004: lightweight-charts는 Next.js App Router에서 dynamic import(`ssr: false`)로 정상 동작한다
- A-005: 일봉 데이터 1년치(~252개)는 단일 또는 최대 5회 페이지네이션으로 조회 가능하다
- A-006: 키움 API Rate Limit이 차트 데이터 조회에 영향을 주지 않는다 (정상 사용 범위)

### 검증 필요 가정
- **A-001, A-002 (HIGH)**: Phase 0에서 API 테스트 스크립트로 실제 응답 필드 확인 필수

---

## 3. Requirements (요구사항)

### 모듈 1: 차트 데이터 API (백엔드)

**REQ-CHART-B01** [Ubiquitous]
시스템은 **항상** 차트 API 응답을 표준 ChartData 형식(symbol, period, candles[])으로 변환해야 한다.

**REQ-CHART-B02** [Event-Driven]
**WHEN** 클라이언트가 `GET /api/stocks/[symbol]/chart?period=daily&from=YYYYMMDD&to=YYYYMMDD`를 요청하면 **THEN** 시스템은 키움 REST API(ka10081)에서 일봉 데이터를 조회하여 ChartData로 반환해야 한다.

**REQ-CHART-B03** [Event-Driven]
**WHEN** 클라이언트가 `period=weekly`로 차트를 요청하면 **THEN** 시스템은 키움 REST API(ka10082)에서 주봉 데이터를 조회하여 ChartData로 반환해야 한다.

**REQ-CHART-B04** [State-Driven]
**IF** 키움 API 응답에 `cont-yn: Y` 헤더가 포함되면 **THEN** 시스템은 `next-key`를 사용하여 최대 5회까지 자동으로 연속 조회하고 결과를 누적해야 한다.

**REQ-CHART-B05** [Unwanted]
시스템은 5회 초과 페이지네이션 요청을 **하지 않아야 한다**.

**REQ-CHART-B06** [State-Driven]
**IF** 캐시에 유효한 차트 데이터가 존재하면 **THEN** 시스템은 키움 API 호출 없이 캐시된 데이터를 반환해야 한다.

**REQ-CHART-B07** [Ubiquitous]
시스템은 **항상** 일봉 차트 데이터를 1시간 TTL, 주봉 데이터를 1일 TTL로 캐싱해야 한다.

### 모듈 2: 차트 UI 컴포넌트 (프론트엔드)

**REQ-CHART-F01** [Event-Driven]
**WHEN** 사용자가 종목 상세 페이지에 진입하면 **THEN** 시스템은 1개월 일봉 캔들스틱 차트를 자동으로 표시해야 한다.

**REQ-CHART-F02** [Event-Driven]
**WHEN** 사용자가 시간프레임(1M/3M/6M/1Y/5Y)을 선택하면 **THEN** 시스템은 해당 기간의 차트 데이터를 로드하여 차트를 갱신해야 한다.

**REQ-CHART-F03** [Event-Driven]
**WHEN** 사용자가 캔들스틱/라인 차트 전환 버튼을 클릭하면 **THEN** 시스템은 API 재호출 없이 동일 데이터로 차트 유형을 즉시 전환해야 한다.

**REQ-CHART-F04** [Unwanted]
시스템은 차트 유형 전환 시 API를 재호출**하지 않아야 한다**.

### 모듈 3: 에러 처리 및 UX

**REQ-CHART-E01** [Event-Driven]
**WHEN** 차트 데이터 로딩 중이면 **THEN** 시스템은 스켈레톤 로딩 UI를 표시해야 한다.

**REQ-CHART-E02** [If-Unwanted]
**IF** 차트 API 호출이 실패하면 **THEN** 시스템은 사용자에게 에러 메시지와 재시도 버튼을 표시해야 한다.

### 모듈 4: 반응형 및 접근성 (Should)

**REQ-CHART-R01** [Optional]
**가능하면** 모바일 환경에서 풀 너비 반응형 차트를 제공해야 한다.

**REQ-CHART-R02** [Optional]
**가능하면** 차트 컨트롤에 키보드 탐색 및 ARIA 레이블을 제공해야 한다.

### 모듈 5: 성능 최적화 (Should)

**REQ-CHART-P01** [Ubiquitous]
시스템은 **항상** lightweight-charts를 dynamic import(`ssr: false`)로 로드하여 서버사이드 렌더링 호환성을 유지해야 한다.

**REQ-CHART-P02** [State-Driven]
**IF** 차트 데이터 응답 시간이 2초를 초과하면 **THEN** 시스템은 타임아웃으로 처리하고 에러 UI를 표시해야 한다.

---

## 4. Specifications (기술 명세)

### 타입 정의

```typescript
interface ChartCandle {
  date: string;      // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartData {
  symbol: string;
  period: 'daily' | 'weekly';
  candles: ChartCandle[];
}

type ChartPeriod = '1M' | '3M' | '6M' | '1Y' | '5Y';
type ChartType = 'candlestick' | 'line';
```

### 시간프레임-API 매핑

| ChartPeriod | api-id | 데이터 포인트 (약) |
|-------------|--------|-------------------|
| 1M | ka10081 (일봉) | ~22 |
| 3M | ka10081 (일봉) | ~66 |
| 6M | ka10081 (일봉) | ~132 |
| 1Y | ka10081 (일봉) | ~252 |
| 5Y | ka10082 (주봉) | ~260 |

### 파일 영향 분석

**신규 파일 (4개)**:
- `src/app/api/stocks/[symbol]/chart/route.ts` - Chart API 라우트
- `src/components/chart/StockChart.tsx` - SWR 데이터 페칭 + 상태 관리
- `src/components/chart/ChartContainer.tsx` - lightweight-charts 렌더링 (client-only)
- `src/components/chart/ChartToolbar.tsx` - 기간/차트유형 선택 UI

**수정 파일 (3개)**:
- `src/lib/kiwoom-stock-api.ts` - fetchChart() 메서드 추가
- `src/types/stock.ts` - ChartCandle, ChartData, ChartPeriod 타입 추가
- `src/app/stock/[symbol]/page.tsx` - StockChart 컴포넌트 삽입

**테스트 파일 (2개)**:
- `src/lib/__tests__/kiwoom-chart-api.test.ts`
- `src/app/api/stocks/[symbol]/chart/__tests__/route.test.ts`

### 데이터 플로우
```
ChartToolbar (기간 선택)
  -> StockChart (SWR fetch)
    -> GET /api/stocks/[symbol]/chart?period=daily&from=...
      -> cache.get() -> MISS
        -> KiwoomStockAPI.fetchChart()
          -> POST /api/dostk/chart (api-id: ka10081)
          -> 페이지네이션 자동 누적
          -> OHLCV 변환
        -> cache.set()
      -> ApiResponse<ChartData> 반환
    -> ChartContainer (lightweight-charts 렌더링)
```

---

## 5. Traceability (추적성)

| 요구사항 ID | plan.md 참조 | acceptance.md 참조 |
|------------|-------------|-------------------|
| REQ-CHART-B01~B07 | Phase 1: 백엔드 | AC-CHART-01~03 |
| REQ-CHART-F01~F04 | Phase 2: 프론트엔드 | AC-CHART-04~06 |
| REQ-CHART-E01~E02 | Phase 2: 프론트엔드 | AC-CHART-07 |
| REQ-CHART-R01~R02 | Phase 2: 프론트엔드 | AC-CHART-08 |
| REQ-CHART-P01~P02 | Phase 1, 2 | AC-CHART-09 |

---

## 6. Scope Exclusion (범위 제외)

다음 항목은 이 SPEC의 범위에 포함되지 않는다:
- 실시간 WebSocket 스트리밍
- 기술적 지표 (MACD, RSI, 볼린저밴드 등)
- 분봉/틱 차트
- 거래량 오버레이 바 (Could - 향후 SPEC)
- 이동평균선 오버레이 (Could - 향후 SPEC)
