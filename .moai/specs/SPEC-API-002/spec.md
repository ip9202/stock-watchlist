---
id: SPEC-API-002
version: "1.0.0"
status: completed
created: "2026-03-10"
updated: "2026-03-10"
author: 강력쇠주먹
priority: high
---

# SPEC-API-002: 키움 REST API 토큰 만료 처리 강화

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-03-10 | 강력쇠주먹 | 초기 SPEC 작성 (P0 Race Condition, P1 API-level Token Retry) |

---

## 1. Environment (환경)

### 1.1 시스템 컨텍스트

- **프로젝트**: Stock Watchlist (Next.js 15 + TypeScript)
- **대상 모듈**: 키움증권 REST API 토큰 관리 레이어
- **핵심 파일**:
  - `src/lib/kiwoom-token-manager.ts` - OAuth2 Bearer Token 관리 싱글톤
  - `src/lib/kiwoom-stock-api.ts` - REST API 클라이언트 (3개 API 메서드)
- **의존성**: axios, Kiwoom OAuth2 API (`https://api.kiwoom.com/oauth2/token`)
- **테스트 프레임워크**: Vitest
- **개발 모드**: TDD (RED-GREEN-REFACTOR)

### 1.2 현재 토큰 라이프사이클

| 항목 | 현재 값 |
|------|---------|
| 토큰 발급 방식 | OAuth2 `client_credentials` grant |
| 토큰 TTL | 24시간 (기본값) |
| 갱신 마진 | 만료 5분 전 |
| 발급 재시도 | 최대 3회, 선형 백오프 (1s, 2s, 3s) |
| 발급 타임아웃 | 10초 |
| 토큰 사용 지점 | `fetchStockDetail()`, `fetchChart()`, `fetchMarketStocks()` |

### 1.3 알려진 에러 코드

| 에러 코드 | 메시지 | 의미 |
|-----------|--------|------|
| `[8005]` | Token이 유효하지 않습니다 | 토큰 만료 또는 무효 |
| `[8001]` | App Key와 Secret Key 검증 실패 | 인증 키 오류 (재시도 불가) |

---

## 2. Assumptions (가정)

### 2.1 기술적 가정

- **A1**: 키움 서버는 동시에 여러 토큰 발급 요청을 수용하지만, rate limit이 존재할 수 있다
  - 신뢰도: Medium
  - 검증 방법: 키움 API 문서 확인, 실제 동시 요청 테스트
  - 위반 시 영향: 토큰 발급 차단 가능

- **A2**: `[8005]` 에러는 토큰 만료 시 일관되게 반환된다
  - 신뢰도: High
  - 검증 방법: 실제 만료 토큰으로 API 호출 테스트 (기존 트러블슈팅에서 확인됨)
  - 위반 시 영향: 토큰 에러 감지 실패

- **A3**: 토큰 갱신 중 기존 캐시 토큰은 여전히 유효할 수 있다 (마진 5분 이내)
  - 신뢰도: Medium
  - 검증 방법: 마진 경계 시나리오 테스트

- **A4**: `KiwoomTokenManager`는 싱글톤으로 단일 Node.js 프로세스 내에서만 동작한다
  - 신뢰도: High
  - 검증 방법: 코드 확인 완료 (라인 10-11, 48-53)

### 2.2 범위 가정

- **A5**: P2 (HTTP 상태코드 분화)와 P3 (Health Check 토큰 상태)는 이 SPEC의 범위 밖이다
- **A6**: `[8001]` 키 검증 실패 에러는 재시도 대상이 아니다 (환경 설정 문제)

---

## 3. Requirements (요구사항)

### 3.1 Ubiquitous 요구사항 (항상 적용)

- **REQ-U01**: 시스템은 **항상** 동시에 하나의 토큰 갱신 요청만 실행해야 한다
  - 추적: P0 Race Condition
  - 근거: 다중 동시 호출 시 중복 토큰 발급 방지, rate limit 위험 감소

- **REQ-U02**: 시스템은 **항상** 토큰 에러에 대한 자동 재시도를 최대 1회로 제한해야 한다
  - 추적: P1 API-level Token Retry
  - 근거: 무한 재시도 루프 방지, 서버 과부하 예방

- **REQ-U03**: 시스템은 **항상** `getAccessToken()` 메서드의 기존 공개 인터페이스를 유지해야 한다
  - 추적: 하위 호환성
  - 근거: 기존 코드와의 호환성 보장, 기존 테스트 통과

### 3.2 Event-Driven 요구사항 (이벤트 기반)

- **REQ-E01**: **WHEN** 토큰이 만료된 상태에서 동시에 여러 `getAccessToken()` 호출이 발생하면 **THEN** 모든 호출이 동일한 토큰 갱신 Promise를 공유해야 한다
  - 추적: P0, Task 1
  - 검증: 동시 3회 호출 시 `fetchToken` mock이 정확히 1회만 호출됨

- **REQ-E02**: **WHEN** 토큰 갱신 Promise가 실패하면 **THEN** 모든 대기 중인 호출자에게 에러가 전파되고 `refreshPromise`가 `null`로 초기화되어야 한다
  - 추적: P0, Task 1
  - 검증: 실패 후 `refreshPromise === null`, 이후 재호출 시 새 발급 시도

- **REQ-E03**: **WHEN** API 호출에서 토큰 에러 `[8005]`가 반환되면 **THEN** 시스템이 토큰을 무효화(`invalidateToken()`)하고 새 토큰으로 1회 재시도해야 한다
  - 추적: P1, Task 3
  - 검증: 첫 번째 실패 후 `invalidateToken()` 호출 + 새 토큰으로 재시도 성공

- **REQ-E04**: **WHEN** 토큰 재시도 후에도 API 호출이 실패하면 **THEN** 에러를 그대로 throw해야 한다
  - 추적: P1, Task 3
  - 검증: 두 번째 실패 시 에러 전파, `invalidateToken()` 2회 이상 미호출

- **REQ-E05**: **WHEN** `invalidateToken()`이 호출되면 **THEN** `accessToken`, `tokenExpiresAt`, `refreshPromise`가 모두 초기화되어야 한다
  - 추적: P0/P1, Task 1
  - 검증: 세 필드 모두 `null` 상태 확인

### 3.3 Unwanted 요구사항 (금지)

- **REQ-N01**: 시스템은 토큰 에러가 아닌 일반 API 에러(네트워크 에러, 500 에러 등)에 대해 자동 재시도를 **하지 않아야 한다**
  - 추적: P1
  - 검증: 네트워크 에러, `return_code !== 0` (비토큰) 시 즉시 throw, `invalidateToken()` 미호출

- **REQ-N02**: 시스템은 `[8001]` (키 검증 실패) 에러에 대해 토큰 재시도를 **하지 않아야 한다**
  - 추적: P1
  - 검증: `[8001]` 에러 시 즉시 throw

### 3.4 State-Driven 요구사항 (조건부)

- **REQ-S01**: **IF** `refreshPromise`가 이미 존재하면(토큰 갱신 중) **THEN** 새로운 `getAccessToken()` 호출은 기존 Promise를 반환해야 한다
  - 추적: P0, Task 1
  - 검증: `refreshPromise !== null` 상태에서 추가 호출이 새 HTTP 요청 생성 없이 같은 Promise를 await

- **REQ-S02**: **IF** 캐시된 토큰이 유효하면 **THEN** `getAccessToken()`은 즉시 캐시 토큰을 반환해야 한다 (기존 동작 유지)
  - 추적: 하위 호환성
  - 검증: `isTokenValid() === true` 시 HTTP 요청 없이 토큰 반환

---

## 4. Specifications (상세 사양)

### 4.1 P0: Promise 기반 토큰 중복 제거

#### 4.1.1 `KiwoomTokenManager` 변경사항

**새 필드**:
- `private refreshPromise: Promise<string> | null = null`

**`getAccessToken()` 수정 로직**:
1. `isTokenValid()` 확인 -> 유효하면 캐시 토큰 반환 (기존 동작)
2. `refreshPromise`가 존재하면 -> 해당 Promise 반환 (신규)
3. `refreshPromise`가 없으면 -> 새 Promise 생성 후 `fetchTokenWithRetry()` 실행
4. `finally` 블록에서 `refreshPromise = null` 보장 (성공/실패 무관)

**`invalidateToken()` 수정**:
- 기존: `accessToken = null`, `tokenExpiresAt = null`
- 추가: `refreshPromise = null`

#### 4.1.2 동시성 보장 메커니즘

```
호출자 A ──┐
호출자 B ──┤──> refreshPromise (단일 Promise) ──> fetchTokenWithRetry() ──> 토큰
호출자 C ──┘
```

- 모든 동시 호출자가 같은 Promise를 `await`
- Promise resolve 시 모든 호출자에게 동일 토큰 전달
- Promise reject 시 모든 호출자에게 동일 에러 전파

### 4.2 P1: API 레벨 토큰 에러 감지 + 재시도

#### 4.2.1 `isTokenError()` 정적 메서드

**파일**: `src/lib/kiwoom-token-manager.ts`

**시그니처**: `static isTokenError(error: unknown): boolean`

**감지 패턴**:
- `Error.message`에 `[8005]` 포함
- `Error.message`에 `Token` 또는 `token` 포함 (대소문자 무시)
- 향후 확장 가능한 에러 코드 상수 배열

**제외 패턴**:
- `[8001]` (키 검증 실패) -> `false` 반환

#### 4.2.2 `requestWithTokenRetry()` 래퍼

**파일**: `src/lib/kiwoom-stock-api.ts`

**시그니처**:
```typescript
private async requestWithTokenRetry<T>(
  requestFn: (token: string) => Promise<T>
): Promise<T>
```

**실행 흐름**:
1. `getAccessToken()`으로 토큰 획득
2. `requestFn(token)` 실행
3. 성공 -> 결과 반환
4. 실패 + `isTokenError(error)` === true -> `invalidateToken()` + 새 토큰으로 1회 재시도
5. 실패 + `isTokenError(error)` === false -> 즉시 throw
6. 재시도 실패 -> 즉시 throw (무한 루프 방지)

#### 4.2.3 기존 메서드 적용

| 메서드 | 래핑 방식 |
|--------|-----------|
| `fetchStockDetail()` | 토큰 획득 + API 호출 부분을 `requestWithTokenRetry` 콜백으로 추출 |
| `fetchChart()` | 첫 페이지 요청을 래퍼로 감싸고, 페이지네이션 루프 내 토큰은 갱신된 토큰 사용 |
| `fetchMarketStocks()` | 토큰 획득 + API 호출 부분을 `requestWithTokenRetry` 콜백으로 추출 |

### 4.3 수정 대상 파일 요약

| 파일 | 변경 유형 | 변경 내용 |
|------|-----------|-----------|
| `src/lib/kiwoom-token-manager.ts` | 수정 | `refreshPromise` 필드, `getAccessToken()` 수정, `invalidateToken()` 확장, `isTokenError()` 추가 |
| `src/lib/kiwoom-stock-api.ts` | 수정 | `requestWithTokenRetry()` 추가, 기존 3개 메서드 래핑 |
| `src/lib/__tests__/kiwoom-token-manager.test.ts` | 수정 | Race condition 테스트, Promise dedup 테스트, `isTokenError()` 테스트 |
| `src/lib/__tests__/kiwoom-stock-api.test.ts` | 수정 | 토큰 재시도 테스트, 에러 감지 테스트 |

**변경 파일 수**: 4개 (프로덕션 2, 테스트 2)

---

## 5. Technical Constraints (기술적 제약)

- **TC-01**: `KiwoomTokenManager`는 싱글톤 패턴을 유지해야 한다
- **TC-02**: 기존 `getAccessToken()` 반환 타입 `Promise<string>`은 변경 불가
- **TC-03**: `fetchTokenWithRetry()`의 재시도 로직 (3회, 선형 백오프)은 변경하지 않는다
- **TC-04**: 토큰 재시도 래퍼는 최대 1회만 재시도한다 (토큰 발급 재시도와 별개)
- **TC-05**: TypeScript strict 모드 준수
- **TC-06**: Vitest 테스트 프레임워크 사용

---

## 6. Dependencies (의존성)

### 6.1 내부 의존성

| 의존 모듈 | 관계 |
|-----------|------|
| `KiwoomTokenManager` (싱글톤) | 수정 대상 - Promise dedup, `isTokenError()` 추가 |
| `KiwoomStockAPI` | 수정 대상 - `requestWithTokenRetry()` 추가 |
| `src/lib/cache.ts` | 변경 없음 - 캐시 레이어는 영향 없음 |
| API Route Handlers | 변경 없음 - `KiwoomStockAPI` 인터페이스 유지 |

### 6.2 외부 의존성

| 의존 서비스 | 버전 | 영향 |
|-------------|------|------|
| axios | 기존 버전 유지 | HTTP 클라이언트 변경 없음 |
| Kiwoom OAuth2 API | v1 | 토큰 발급 엔드포인트 변경 없음 |
| Kiwoom REST API | v1 | `[8005]` 에러 코드 의존 |

### 6.3 선행 SPEC

| SPEC | 관계 |
|------|------|
| SPEC-API-001 | 키움 REST API 전환 (완료) - 현재 토큰 관리 기반 |
| SPEC-CHART-001 | 차트 기능 (완료) - `fetchChart()` 래핑 대상 |

---

## 7. Scope (범위)

### 7.1 In Scope

- **P0**: `getAccessToken()` Promise 기반 중복 제거 (Race Condition 해결)
- **P1**: API 레벨 토큰 에러 감지 (`isTokenError()`) 및 1회 재시도 (`requestWithTokenRetry()`)
- 기존 3개 API 메서드에 재시도 래퍼 적용
- 관련 단위 테스트 추가

### 7.2 Out of Scope

- **P2**: HTTP 상태코드 분화 (401, 429, 503) -> 별도 SPEC
- **P2**: 로깅/모니터링 (토큰 갱신 이벤트, API 응답 시간) -> 별도 SPEC
- **P3**: Health Check 토큰 상태 보고 -> 별도 SPEC
- API Route Handler 변경 (인터페이스 유지로 불필요)

---

## 8. Traceability (추적성)

| 요구사항 ID | Task | 파일 | 테스트 |
|-------------|------|------|--------|
| REQ-U01 | Task 1 | kiwoom-token-manager.ts | 동시 호출 Promise 공유 테스트 |
| REQ-U02 | Task 3 | kiwoom-stock-api.ts | 재시도 1회 제한 테스트 |
| REQ-U03 | Task 1 | kiwoom-token-manager.ts | 기존 테스트 통과 검증 |
| REQ-E01 | Task 1 | kiwoom-token-manager.ts | 동시 3회 호출, mock 1회 호출 검증 |
| REQ-E02 | Task 1 | kiwoom-token-manager.ts | 실패 시 에러 전파 + 초기화 검증 |
| REQ-E03 | Task 3, 4 | kiwoom-stock-api.ts | [8005] 에러 시 재시도 성공 검증 |
| REQ-E04 | Task 3 | kiwoom-stock-api.ts | 재시도 후 실패 시 throw 검증 |
| REQ-E05 | Task 1 | kiwoom-token-manager.ts | 세 필드 null 확인 |
| REQ-N01 | Task 3 | kiwoom-stock-api.ts | 비토큰 에러 즉시 throw 검증 |
| REQ-N02 | Task 2 | kiwoom-token-manager.ts | [8001] 에러 false 반환 검증 |
| REQ-S01 | Task 1 | kiwoom-token-manager.ts | refreshPromise 재사용 검증 |
| REQ-S02 | Task 1 | kiwoom-token-manager.ts | 유효 토큰 즉시 반환 검증 |
