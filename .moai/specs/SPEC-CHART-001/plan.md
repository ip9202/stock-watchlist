# SPEC-CHART-001 Implementation Plan

```yaml
spec-id: SPEC-CHART-001
development-mode: tdd
tags: [chart, kiwoom-api, frontend, lightweight-charts]
```

---

## 개발 방법론

**TDD (RED-GREEN-REFACTOR)** - quality.yaml `development_mode: tdd` 기준

---

## Phase 0: API 응답 검증 (Primary Goal - 선행 필수)

### 목적
- 가정 A-001, A-002 검증: 키움 REST API 차트 엔드포인트 실제 응답 확인
- 응답 필드명 매핑 확정

### 태스크
| ID | 태스크 | TDD 단계 | 파일 |
|----|--------|---------|------|
| T-00 | API 테스트 스크립트 작성 | N/A (탐색) | `scripts/test-chart-api.ts` |

### 산출물
- 실제 API 응답 구조 문서화
- ChartCandle 필드 매핑 확정 (응답 필드 -> OHLCV)
- 페이지네이션 동작 확인 (cont-yn, next-key)

### 리스크 대응
- **R-001 (HIGH)**: 응답 필드명이 가정과 다를 경우 → T-01 테스트 및 파서 로직 수정

---

## Phase 1: 백엔드 구현 (Primary Goal)

### 태스크 분해 (TDD: RED-GREEN-REFACTOR)

| ID | 태스크 | TDD 단계 | 파일 | 의존성 |
|----|--------|---------|------|--------|
| T-01 | ChartCandle, ChartData 타입 정의 | GREEN | `src/types/stock.ts` | Phase 0 |
| T-02 | fetchChart() 테스트 작성 | RED | `src/lib/__tests__/kiwoom-chart-api.test.ts` | T-01 |
| T-03 | fetchChart() 구현 (일봉) | GREEN | `src/lib/kiwoom-stock-api.ts` | T-02 |
| T-04 | fetchChart() 주봉 테스트/구현 | RED-GREEN | 동일 | T-03 |
| T-05 | 페이지네이션 자동 누적 테스트/구현 | RED-GREEN | 동일 | T-03 |
| T-06 | Chart API 라우트 테스트 작성 | RED | `src/app/api/stocks/[symbol]/chart/__tests__/route.test.ts` | T-03 |
| T-07 | Chart API 라우트 구현 | GREEN | `src/app/api/stocks/[symbol]/chart/route.ts` | T-06 |
| T-08 | 캐시 통합 (일봉 1h, 주봉 1d TTL) | GREEN | `route.ts` | T-07 |
| T-09 | 리팩토링 및 에러 처리 강화 | REFACTOR | 전체 백엔드 | T-08 |

### 기술 접근

**KiwoomStockAPI 확장 전략**:
- 기존 `createHeaders()` 메서드 재사용 (api-id만 변경)
- 기존 `parseSignedNumber()` 재사용 (가격 데이터 파싱)
- 새 상수: `CHART_ENDPOINT = 'https://api.kiwoom.com/api/dostk/chart'`
- 새 메서드: `fetchChart(symbol, apiId, params)`

**API 라우트 설계**:
```
GET /api/stocks/[symbol]/chart
  Query: period=daily|weekly, from=YYYYMMDD, to=YYYYMMDD
  Response: { success: true, data: ChartData }
```

**캐시 전략**:
- 캐시 키: `chart:{symbol}:{period}:{from}:{to}`
- 일봉 TTL: 3600초 (1시간)
- 주봉 TTL: 86400초 (1일)

---

## Phase 2: 프론트엔드 구현 (Secondary Goal)

### 태스크 분해

| ID | 태스크 | TDD 단계 | 파일 | 의존성 |
|----|--------|---------|------|--------|
| T-10 | lightweight-charts 패키지 설치 | N/A | `package.json` | - |
| T-11 | ChartToolbar 컴포넌트 | RED-GREEN | `src/components/chart/ChartToolbar.tsx` | T-10 |
| T-12 | ChartContainer 컴포넌트 (dynamic import) | RED-GREEN | `src/components/chart/ChartContainer.tsx` | T-10 |
| T-13 | StockChart 컴포넌트 (SWR 통합) | RED-GREEN | `src/components/chart/StockChart.tsx` | T-11, T-12 |
| T-14 | 로딩/에러 UI 상태 처리 | GREEN | `StockChart.tsx` | T-13 |
| T-15 | 프론트엔드 리팩토링 | REFACTOR | 전체 프론트엔드 | T-14 |

### 컴포넌트 구조

```
src/components/chart/
  ChartToolbar.tsx      # 기간(1M~5Y) + 차트유형(캔들/라인) 선택
  ChartContainer.tsx    # lightweight-charts 렌더링 (use client, dynamic import)
  StockChart.tsx        # SWR 페칭, 상태 관리, 자식 컴포넌트 조합
  index.ts              # barrel export
```

### 기술 접근

**차트 렌더링 (ChartContainer)**:
- `dynamic(() => import('./ChartContainer'), { ssr: false })` 패턴
- `useRef`로 차트 DOM 참조
- `useEffect`로 차트 인스턴스 생성/갱신/정리
- 캔들스틱 <-> 라인 전환 시 시리즈 교체 (차트 인스턴스 재사용)

**데이터 페칭 (StockChart)**:
- SWR `useSWR` 훅으로 차트 데이터 페칭
- `period` 변경 시 from/to 자동 계산
- 5Y 선택 시 자동으로 weekly period 전환

---

## Phase 3: 통합 및 마무리 (Final Goal)

### 태스크 분해

| ID | 태스크 | 파일 | 의존성 |
|----|--------|------|--------|
| T-16 | 종목 상세 페이지에 StockChart 삽입 | `src/app/stock/[symbol]/page.tsx` | Phase 1, 2 |
| T-17 | 외부 차트 링크 영역 교체 (L418-441) | 동일 | T-16 |
| T-18 | 전체 통합 테스트 | 전체 | T-17 |
| T-19 | 최종 커버리지 확인 (85%+) | N/A | T-18 |

---

## 리스크 및 대응

| ID | 리스크 | 심각도 | 대응 전략 |
|----|--------|--------|----------|
| R-001 | ka10081 응답 필드명 미확인 | HIGH | Phase 0에서 API 테스트 스크립트로 사전 검증 |
| R-002 | lightweight-charts 번들 크기 | MEDIUM | ~45KB로 수용 가능, dynamic import로 코드 스플리팅 |
| R-003 | 키움 API Rate Limit | MEDIUM | 캐싱으로 API 호출 최소화, 페이지네이션 최대 5회 제한 |
| R-004 | 모바일 캔들스틱 렌더링 성능 | LOW | lightweight-charts WebGL 기반으로 성능 우수, 데이터 포인트 260개 이하 |

---

## 아키텍처 설계 방향

### 백엔드 확장 패턴
```
KiwoomStockAPI (기존)
  ├── fetchStockList()      (기존)
  ├── fetchStockDetail()    (기존)
  └── fetchChart()          (신규 - ka10081/ka10082)
```

### 캐시 통합
```
cache.ts (기존 인메모리 캐시)
  ├── stock-list:*    TTL: 7일 (기존)
  ├── stock-detail:*  TTL: 30초 (기존)
  └── chart:*         TTL: 1시간/1일 (신규)
```

### 프론트엔드 컴포넌트 트리
```
page.tsx (종목 상세)
  └── StockChart (데이터 페칭 + 상태)
        ├── ChartToolbar (기간/유형 선택)
        └── ChartContainer (lightweight-charts 렌더링, dynamic import)
```

---

## 전문가 상담 권장

- **expert-backend**: API 클라이언트 확장 패턴, 페이지네이션 전략, 캐시 설계 검토
- **expert-frontend**: lightweight-charts 통합, SSR 호환성, 반응형 차트 구현 검토
