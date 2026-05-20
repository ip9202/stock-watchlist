# SPEC-MARKET-001: 메인 페이지 시장 지표 차트

## 개요

메인 대시보드 페이지에 코스피 지수, 코스닥 지수, USD/KRW 환율 미니 차트를 표시하여 시장 현황을 한눈에 파악할 수 있도록 한다.

## 배경

현재 메인 페이지는 종목 검색과 관심종목 목록만 표시한다. 사용자는 시장 전체 흐름(지수, 환율)을 파악하기 위해 외부 사이트를 방문해야 하므로, 메인 페이지에 시장 지표를 추가하여 UX를 개선한다.

## 데이터 소스

### 코스피/코스닥 지수
- **API**: 키움증권 REST API (업종 카테고리)
- **현재가**: `ka20001` (업종현재가요청)
- **분봉 차트**: `ka20005` (업종분봉차트)
- **일봉 차트**: `ka20006` (업종일봉차트)
- **엔드포인트**: `POST https://api.kiwoom.com/api/dostk/chart` (기존 차트 엔드포인트 동일)
- **업종코드**: 코스피 `'0001'`, 코스닥 `'1001'`
- **인증**: 기존 키움 OAuth2 토큰 재사용

### USD/KRW 환율
- **API**: Frankfurter API (ECB 기반, 무료, API 키 불필요)
- **현재 환율**: `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW`
- **히스토리**: `GET https://api.frankfurter.dev/v1/{from}..{to}?base=USD&symbols=KRW`
- **업데이트 주기**: 평일 1일 1회 (ECB 발표 기준)
- **Rate Limit**: 없음

## 요구사항 (EARS 형식)

### REQ-001: 시장 지표 섹션 표시
**When** 사용자가 메인 대시보드 페이지에 접속하면,
**the system shall** 종목 검색 섹션 위에 코스피, 코스닥, USD/KRW 환율 3개의 미니 차트 카드를 가로 배열로 표시한다.

### REQ-002: 코스피 지수 미니 차트
**When** 메인 페이지가 로드되면,
**the system shall** 코스피 지수의 현재값, 등락률, 당일 인트라데이 라인 차트를 표시한다.
- 차트 높이: 120px (미니 차트)
- 데이터: 당일 분봉 (ka20005, tic_scope=1)
- 색상: 전일 대비 상승 시 빨간색, 하락 시 파란색

### REQ-003: 코스닥 지수 미니 차트
**When** 메인 페이지가 로드되면,
**the system shall** 코스닥 지수의 현재값, 등락률, 당일 인트라데이 라인 차트를 표시한다.
- 코스피와 동일한 UI/UX 패턴 적용

### REQ-004: USD/KRW 환율 미니 차트
**When** 메인 페이지가 로드되면,
**the system shall** USD/KRW 환율의 현재값, 등락률, 최근 30일 라인 차트를 표시한다.
- Frankfurter API 사용 (API 키 불필요)
- 차트 높이: 120px

### REQ-005: 반응형 레이아웃
**When** 화면 너비가 768px 미만이면,
**the system shall** 3개의 미니 차트 카드를 세로 배열로 전환한다.
- Desktop (>=768px): 3열 가로 배열
- Mobile (<768px): 1열 세로 배열

### REQ-006: 로딩 및 에러 상태
**When** 시장 지표 데이터를 로딩 중이면,
**the system shall** 각 카드에 스켈레톤 애니메이션을 표시한다.
**When** API 호출이 실패하면,
**the system shall** 해당 카드에 "데이터를 불러올 수 없습니다" 메시지를 표시하고, 다른 카드의 정상 표시에 영향을 주지 않아야 한다.

### REQ-007: 캐시 전략
**the system shall** 시장 지표 데이터에 적절한 캐시 TTL을 적용한다.
- 코스피/코스닥 분봉: 1분 TTL (장중 빈번 갱신)
- 환율: 1시간 TTL (1일 1회 업데이트)

## 팀 모드 태스크 분할

### Task 1: 백엔드 - 업종 지수 API (team-coder: backend)
**파일**: `src/lib/kiwoom-stock-api.ts`, `src/app/api/market/route.ts`
- KiwoomStockAPI에 `fetchIndexInfo(indsCd)` 메서드 추가
- KiwoomStockAPI에 `fetchIndexChart(indsCd, period, from, to)` 메서드 추가
- `/api/market` API 라우트 생성 (코스피+코스닥 지수 데이터 반환)
- `/api/market/chart` API 라우트 생성 (지수 차트 데이터 반환)
- 캐시 적용 (1분 TTL)

### Task 2: 백엔드 - 환율 API (team-coder: backend)
**파일**: `src/lib/frankfurter-api.ts`, `src/app/api/market/exchange/route.ts`
- FrankfurterAPI 클래스 생성 (현재 환율 + 히스토리)
- `/api/market/exchange` API 라우트 생성
- 캐시 적용 (1시간 TTL)

### Task 3: 프론트엔드 - MarketIndicators 컴포넌트 (team-coder: frontend)
**파일**: `src/components/dashboard/MarketIndicators.tsx`, `src/components/dashboard/MiniChart.tsx`
- MarketIndicators 컨테이너 컴포넌트 (3열 그리드)
- MiniChart 공통 컴포넌트 (lightweight-charts 미니 라인 차트)
- SWR로 데이터 페칭
- 로딩/에러 상태 처리
- 반응형 레이아웃 (3열 → 1열)

### Task 4: 프론트엔드 - 메인 페이지 통합 (team-coder: frontend)
**파일**: `src/app/page.tsx`
- MarketIndicators를 종목 검색 섹션 위에 배치
- Task 3 완료 후 실행 (의존성)

### Task 5: 테스트 (team-tester)
**파일**: `src/lib/__tests__/frankfurter-api.test.ts`, `src/app/api/market/__tests__/route.test.ts`
- 업종 지수 API 단위 테스트
- 환율 API 단위 테스트
- API 라우트 테스트

### 의존성 그래프
```
Task 1 (백엔드 지수) ──┐
                       ├→ Task 3 (프론트엔드 컴포넌트) → Task 4 (페이지 통합)
Task 2 (백엔드 환율) ──┘
                                                         └→ Task 5 (테스트)
```

**병렬 실행 가능**: Task 1 + Task 2 (백엔드 독립), Task 3은 Task 1,2 완료 후, Task 4는 Task 3 후

## UI 와이어프레임

```
┌─────────────────────────────────────────────────────────┐
│ Stock Watchlist                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ KOSPI       │  │ KOSDAQ      │  │ USD/KRW     │     │
│  │ 2,650.32    │  │ 875.21      │  │ 1,490.75    │     │
│  │ +1.25%  ▲  │  │ -0.38%  ▼  │  │ +0.12%  ▲  │     │
│  │ ╱╲_╱╲╱╲   │  │ ╲╱╲_╱╲╱    │  │ ╱╲╱╲_╱╲    │     │
│  │ (미니차트)  │  │ (미니차트)  │  │ (미니차트)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 종목 검색                                        │    │
│  │ [검색어 입력...]                                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  관심종목 목록 ...                                        │
└─────────────────────────────────────────────────────────┘
```

## 기술 결정사항

1. **lightweight-charts 재사용**: 기존 차트 인프라를 미니 차트용으로 축소 사용
2. **SWR 데이터 페칭**: 기존 패턴 유지 (revalidateOnFocus: false)
3. **독립 에러 처리**: 한 카드 실패가 다른 카드에 영향 없음
4. **키움 API 토큰**: 기존 KiwoomTokenManager 싱글톤 재사용
5. **새 타입 정의**: `MarketIndex`, `ExchangeRate` 인터페이스 추가

## 범위 외 (Out of Scope)

- 실시간 WebSocket 스트리밍 (향후 SPEC)
- 지수 상세 페이지 (클릭 시 이동)
- 추가 환율 (EUR, JPY 등)
- 지수/환율 알림 기능
