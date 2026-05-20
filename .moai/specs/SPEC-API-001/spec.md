---
id: SPEC-API-001
title: 키움증권 REST API 완전 전환
version: 1.0.0
status: Completed
created: 2026-03-10
updated: 2026-03-10
author: 강력쇠주먹
priority: High
tags: [api-migration, kiwoom, rest-api, stock-data]
lifecycle: spec-first
---

# SPEC-API-001: 키움증권 REST API 완전 전환

## 배경 (Background)

현재 Stock Watchlist 애플리케이션은 주식 데이터 수집을 위해 두 가지 외부 데이터 소스를 혼용하고 있다.

### 현재 아키텍처의 문제점

**1. 종목 검색 (PyKRX 의존)**

- `scripts/fetch_all_stocks_kiwoom.py`에서 PyKRX 라이브러리를 사용하여 KOSPI/KOSDAQ 전체 종목 리스트를 조회
- PyKRX는 외부 Python 라이브러리로, 초기 로딩이 느리고 7일 캐시가 필요
- Next.js API Route (`src/app/api/stocks/route.ts`)에서 `child_process.spawn`으로 Python 스크립트를 실행하는 비효율적 구조
- PyKRX가 내부적으로 한국거래소 웹을 스크래핑하므로 불안정할 수 있음

**2. 개별 종목 시세 (Kiwoom WebSocket 의존)**

- `scripts/fetch_stock_data_kiwoom.py`에서 키움증권 WebSocket API (`wss://api.kiwoom.com:10000/api/dostk/websocket`)를 사용
- WebSocket 연결 -> 로그인 -> 종목 등록 -> 데이터 수신 -> 종료의 복잡한 라이프사이클
- 다수 필드가 0으로 반환됨: `marketCap`, `high52w`, `low52w`, `open`, `previousClose`, `tradingValue`, `sharesOutstanding`, `volumeRatio`
- 실시간 스트리밍 목적의 WebSocket을 단건 조회에 사용하여 비효율적
- 매 요청마다 WebSocket 연결/해제 오버헤드 발생

**3. 공통 문제**

- Python `child_process` 호출로 인한 프로세스 생성 오버헤드
- 토큰 관리가 스크립트마다 중복 구현됨
- 에러 처리가 일관되지 않음

### 전환 대상

키움증권 REST API (`https://api.kiwoom.com`)는 위의 모든 문제를 해결할 수 있는 단일 데이터 소스를 제공한다.

- 인증: OAuth2 Bearer Token (`POST /oauth2/token`)
- 시세 API: `/api/dostk/mdstock` (ka10001: 주식현재가시세, ka10002: 등락율순위)
- 종목정보 API: `/api/dostk/stkbasic` (종목기본정보, 52주 데이터)
- 이미 `scripts/fetch_stocks_kiwoom_rest.py`에 부분 구현이 존재함 (토큰 발급 + CAF07010 TR 호출)

---

## 범위 (Scope)

### 포함 (In Scope)

- 키움증권 REST API 토큰 관리 모듈 구현
- PyKRX 종목 리스트 조회를 키움 REST API로 전환
- WebSocket 개별 시세 조회를 키움 REST API로 전환
- StockInfo 인터페이스의 모든 필드를 REST API 응답으로 채움
- Next.js API Route 업데이트 (Python child_process 제거 또는 최소화)
- 캐시 전략 유지 (종목 리스트 7일 캐시, 시세 30초 TTL)
- 기존 검색 로직 (점수 기반 매칭) 유지
- 에러 처리 및 fallback 전략

### 제외 (Out of Scope)

- 뉴스 API (Naver News API) - 변경 없음
- 공시 API (DART API) - 변경 없음
- 프론트엔드 UI 변경 - 데이터 구조가 동일하므로 변경 불필요
- 데이터베이스 스키마 변경 - 해당 없음
- 사용자 인증/로그인 기능 - 별도 SPEC
- 실시간 WebSocket 스트리밍 기능 (향후 별도 SPEC)

---

## 가정 (Assumptions)

1. 키움증권 REST API가 KOSPI/KOSDAQ 전체 종목 리스트를 제공하는 엔드포인트가 존재한다 (API 가이드에서 확인 필요)
2. REST API의 시세 응답에 `marketCap`, `high52w`, `low52w`, `open`, `previousClose` 등 StockInfo의 모든 필드에 해당하는 데이터가 포함된다
3. `KIWOOM_APP_KEY`와 `KIWOOM_SECRET_KEY` 환경변수가 이미 설정되어 있다
4. 키움 REST API 토큰의 유효시간은 발급 후 일정 시간 (API 문서 확인 필요, 일반적으로 24시간)
5. REST API 호출 제한(Rate Limit)이 애플리케이션 사용량 대비 충분하다
6. Python 스크립트 방식을 유지하되, REST API 호출로 전환하면 WebSocket 대비 단순화된다

---

## 요구사항 (Requirements)

### REQ-001: 토큰 관리 (Ubiquitous)

시스템은 **항상** 키움증권 REST API 접근토큰을 안전하게 관리해야 한다.

- The token management module SHALL maintain a valid Bearer token for all Kiwoom REST API calls.
- The token management module SHALL automatically refresh the token before expiration.
- The token management module SHALL cache the token to avoid redundant `/oauth2/token` calls.
- The token management module SHALL provide a single shared token instance across all API calls.

### REQ-002: 종목 리스트 조회 전환 (Event-Driven)

**WHEN** 사용자가 종목 검색을 요청하면, **THEN** 시스템은 키움 REST API에서 종목 리스트를 조회하여 검색 결과를 반환해야 한다.

- WHEN a stock search request is received, THE system SHALL query the Kiwoom REST API for the stock list instead of PyKRX.
- WHEN the stock list cache is valid (within 7 days), THE system SHALL return results from cache without API calls.
- WHEN the cache is expired or missing, THE system SHALL fetch fresh data from Kiwoom REST API and update the cache.

### REQ-003: 개별 종목 시세 조회 전환 (Event-Driven)

**WHEN** 특정 종목의 상세 시세가 요청되면, **THEN** 시스템은 키움 REST API로 완전한 시세 데이터를 반환해야 한다.

- WHEN a stock detail request is received, THE system SHALL use Kiwoom REST API instead of WebSocket API.
- THE response SHALL populate ALL fields of the StockInfo interface with actual data (no zero-value placeholders).
- WHEN the Kiwoom REST API returns data, THE system SHALL map the response to fill: `price`, `changeAmount`, `changePercent`, `volume`, `marketCap`, `tradingValue`, `sharesOutstanding`, `volumeRatio`, `high`, `low`, `open`, `previousClose`, `high52w`, `low52w`.

### REQ-004: 데이터 완전성 보장 (State-Driven)

**IF** REST API 응답에서 특정 필드가 누락되면, **THEN** 시스템은 추가 API 호출로 데이터를 보완하거나 명시적으로 `null`을 반환해야 한다.

- IF a required field is missing from the primary API response, THEN THE system SHALL attempt to fetch it from an alternative Kiwoom REST endpoint.
- IF the field is still unavailable after fallback, THEN THE system SHALL return `null` instead of `0` to distinguish missing data from actual zero values.

### REQ-005: API 호출 최적화 (Ubiquitous)

시스템은 **항상** 불필요한 API 호출을 최소화해야 한다.

- THE system SHALL maintain the existing 30-second TTL cache for individual stock data.
- THE system SHALL maintain the existing 7-day cache for the full stock list.
- THE system SHALL reuse the same access token across multiple API calls within its validity period.
- THE system SHALL NOT create new processes (child_process) for each API call if direct HTTP calls from TypeScript are feasible.

### REQ-006: 에러 처리 (Unwanted Behavior)

시스템은 API 장애 시에도 **안정적으로** 동작해야 한다.

- IF the Kiwoom REST API returns an error or times out, THEN THE system SHALL return a structured error response with `success: false` and a descriptive error message.
- THE system SHALL NOT expose API keys or internal error details in client-facing responses.
- IF token refresh fails, THEN THE system SHALL retry up to 3 times with exponential backoff before returning an error.

### REQ-007: 기존 인터페이스 호환 (Ubiquitous)

시스템은 **항상** 기존 프론트엔드 API 계약을 유지해야 한다.

- THE API response format for `/api/stocks?q=` SHALL remain identical (StockSearchResult[]).
- THE API response format for `/api/stocks/[symbol]` SHALL remain identical (StockInfo).
- THE system SHALL NOT require any frontend code changes for this migration.

---

## 기술 제약 (Technical Constraints)

1. **런타임 환경**: Next.js 15.5.2 (App Router) + Node.js 18+
2. **인증 방식**: OAuth2 client_credentials grant (Bearer Token)
3. **API Base URL**: `https://api.kiwoom.com` (실전), `https://mockapi.kiwoom.com` (모의투자)
4. **환경변수**: `KIWOOM_APP_KEY`, `KIWOOM_SECRET_KEY` (기존 사용 중)
5. **Python 의존성**: 현재 `child_process`로 Python 실행 중이며, TypeScript에서 직접 HTTP 호출로 전환 검토
6. **캐시**: 인메모리 캐시 (`src/lib/cache.ts`) 사용 중
7. **Docker**: 프로덕션 환경은 Docker 컨테이너 (Python 포함)

---

## 추적성 (Traceability)

| 요구사항 | 구현 대상 | 테스트 시나리오 |
|----------|-----------|----------------|
| REQ-001 | 토큰 관리 모듈 | ACC-001 |
| REQ-002 | 종목 리스트 API | ACC-002 |
| REQ-003 | 개별 시세 API | ACC-003 |
| REQ-004 | 데이터 보완 로직 | ACC-003, ACC-004 |
| REQ-005 | 캐시 및 최적화 | ACC-002, ACC-003 |
| REQ-006 | 에러 처리 | ACC-004 |
| REQ-007 | API 호환성 | ACC-002, ACC-003 |

---

## 구현 노트 (Implementation Notes)

### 완료된 구현 (Completed Implementation)

전체 SPEC-API-001 마이그레이션이 성공적으로 완료되었습니다.

**구현 결과:**
- 총 7개 작업 완료 (Task #1-7)
- 36개 테스트 통과 (100%)
- 평균 코드 커버리지 ~90% (목표: 85% 이상)
- TDD 사이클 완료 (RED → GREEN → REFACTOR)

**생성된 모듈:**
1. `src/lib/kiwoom-token-manager.ts` - OAuth2 토큰 관리 모듈
   - 토큰 발급, 캐싱, 자동 갱신, 재시도 로직
   - 테스트 커버리지: 88.88%, 10/10 테스트 통과

2. `src/lib/kiwoom-stock-api.ts` - Kiwoom REST API 클라이언트
   - 종목 리스트 조회, 개별 종목 상세 정보 조회
   - 테스트 커버리지: 90.5%, 10/10 테스트 통과

3. `src/lib/env.ts` - 환경변수 검증 모듈
   - 필수 환경변수 검증 (KIWOOM_APP_KEY, KIWOOM_SECRET_KEY)
   - 시작 시점 환경 설정 확인

**업데이트된 API 라우트:**
- `src/app/api/stocks/route.ts` - PyKRX에서 KiwoomStockAPI로 전환
- `src/app/api/stocks/[symbol]/route.ts` - WebSocket에서 REST API로 전환

**캐시 전략:**
- 종목 리스트: 7일 캐시
- 개별 종목 시세: 30초 TTL

**에러 처리:**
- 구조화된 에러 응답 (success: false)
- API 키 보호 (클라이언트 응답에 키 노출 안 함)
- 3회 재시도 + 지수 백오프

**제거된 코드:**
- `src/lib/constants.ts` - 불필요한 상수 파일 삭제
- `scripts/fetch_all_stocks_kiwoom.py` - 미사용 Python 스크립트 제거
- `scripts/fetch_stock_data_kiwoom.py` - WebSocket 기반 스크립트 제거
- 불필요한 Python 호출 관련 함수 정리

**기술 사항:**
- Vitest를 사용한 TypeScript 테스트 (36개 테스트)
- TypeScript로 직접 REST API 호출 (child_process 제거)
- Next.js 15.5.2 + Node.js 18+ 환경
- OAuth2 client_credentials grant 인증 방식
