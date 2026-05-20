# SPEC-API-002: 키움 REST API 토큰 만료 처리 강화

## 개요

| 항목 | 내용 |
|------|------|
| SPEC ID | SPEC-API-002 |
| 제목 | 키움 REST API 토큰 만료 처리 강화 |
| 상태 | Planned |
| 우선순위 | High |
| 범위 | P0 (Race Condition), P1 (API-level Token Retry) |
| 범위 외 | P2 (HTTP 상태코드 분화), P3 (Health Check 토큰 상태) |

## 문제 분석

### P0 CRITICAL: Race Condition (동시 토큰 갱신)

현재 `getAccessToken()` 흐름:
1. `isTokenValid()` 확인
2. 유효하지 않으면 `fetchTokenWithRetry()` 호출
3. 새 토큰 발급 후 반환

**문제**: 토큰 만료 시점에 동시에 3개 API 요청이 들어오면, 각각 독립적으로 `fetchTokenWithRetry()`를 호출한다. 키움 서버에 불필요한 토큰 발급 요청이 3회 발생하고, rate limit 위험이 증가한다.

**근본 원인**: `getAccessToken()`에 in-flight Promise 추적이 없다. 첫 번째 호출이 토큰을 가져오는 동안 후속 호출이 같은 Promise를 공유하지 않는다.

### P1 HIGH: API-level 토큰 재시도 부재

현재 `KiwoomStockAPI` 메서드 흐름:
1. `getAccessToken()`으로 토큰 획득
2. API 호출 실행
3. 에러 발생 시 그대로 throw

**문제**: 토큰이 캐시에는 유효하지만 서버에서 실제로 만료된 경우(5분 마진 내 edge case), `[8005]` 에러가 클라이언트에 그대로 전파된다. 사용자는 새로고침이 필요하다.

**근본 원인**: API 호출 레벨에서 토큰 에러를 감지하고 토큰을 무효화한 후 재시도하는 로직이 없다.

---

## 기술 접근 방식

### P0: Promise 기반 중복 제거 (Token Deduplication)

`KiwoomTokenManager`에 `refreshPromise` 필드를 추가한다:

- `private refreshPromise: Promise<string> | null = null`
- `getAccessToken()` 진입 시, `refreshPromise`가 존재하면 해당 Promise를 반환
- `refreshPromise`가 없으면 새로 생성하고, 완료/실패 시 `null`로 초기화
- 모든 동시 호출자가 같은 Promise를 await

**핵심 원칙**: 단일 in-flight 토큰 요청만 존재하도록 보장

### P1: API 레벨 토큰 에러 감지 + 1회 재시도

`KiwoomStockAPI`에 공통 요청 래퍼를 추가한다:

- `private async requestWithTokenRetry<T>(requestFn: (token: string) => Promise<T>): Promise<T>`
- 첫 번째 시도에서 토큰 에러(`[8005]` 또는 `return_code` 기반) 감지
- 토큰 무효화 (`invalidateToken()`) 후 새 토큰으로 1회 재시도
- 2번째 실패는 그대로 throw (무한 루프 방지)

**핵심 원칙**: 최대 1회만 재시도, 무한 재시도 방지

---

## Task 분해

### Task 1: Promise 기반 토큰 중복 제거 (P0)

**파일**: `src/lib/kiwoom-token-manager.ts`

**변경 내용**:
- `refreshPromise: Promise<string> | null` 필드 추가
- `getAccessToken()` 수정: in-flight Promise 공유 로직
- `invalidateToken()` 수정: `refreshPromise`도 함께 초기화
- Promise 완료/실패 시 `refreshPromise = null` 보장 (finally 블록)

**의존성**: 없음 (독립 작업)

### Task 2: 토큰 에러 감지 유틸리티

**파일**: `src/lib/kiwoom-token-manager.ts`

**변경 내용**:
- `isTokenError(error: unknown): boolean` 정적 메서드 추가
- `[8005]` 에러 코드 또는 "Token" 관련 에러 메시지 패턴 감지
- `return_code` 기반 토큰 에러 코드 상수 정의

**의존성**: 없음 (독립 작업)

### Task 3: API 레벨 토큰 재시도 래퍼 (P1)

**파일**: `src/lib/kiwoom-stock-api.ts`

**변경 내용**:
- `requestWithTokenRetry<T>()` private 메서드 추가
- 토큰 에러 감지 시 `invalidateToken()` + 재시도 1회
- 재시도 카운터로 무한 루프 방지

**의존성**: Task 2 (토큰 에러 감지 유틸리티)

### Task 4: 기존 API 메서드에 재시도 래퍼 적용

**파일**: `src/lib/kiwoom-stock-api.ts`

**변경 내용**:
- `fetchStockDetail()`: `requestWithTokenRetry` 래퍼 적용
- `fetchChart()`: `requestWithTokenRetry` 래퍼 적용
- `fetchMarketStocks()`: `requestWithTokenRetry` 래퍼 적용
- 각 메서드의 토큰 획득 + API 호출 부분을 콜백으로 추출

**의존성**: Task 3

---

## 수정 대상 파일

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/lib/kiwoom-token-manager.ts` | 수정 | Promise dedup, `isTokenError()`, `invalidateToken()` 개선 |
| `src/lib/kiwoom-stock-api.ts` | 수정 | `requestWithTokenRetry()` 추가, 기존 3개 메서드 래핑 |
| `src/lib/__tests__/kiwoom-token-manager.test.ts` | 수정 | Race condition 테스트, Promise dedup 테스트 |
| `src/lib/__tests__/kiwoom-stock-api.test.ts` | 수정 | 토큰 재시도 테스트, 에러 감지 테스트 |

**변경 파일 수**: 4개 (프로덕션 2, 테스트 2)

---

## 테스트 전략 (TDD: RED-GREEN-REFACTOR)

### RED 단계: 실패 테스트 먼저 작성

#### Token Manager 테스트 (Task 1, 2)

1. **동시 호출 Promise 공유 테스트**
   - 토큰 만료 상태에서 `getAccessToken()` 3회 동시 호출
   - `fetchToken` mock이 정확히 1회만 호출되었는지 검증
   - 3개 호출 모두 같은 토큰을 반환하는지 검증

2. **Promise 실패 시 정리 테스트**
   - 토큰 발급 실패 시 `refreshPromise`가 `null`로 초기화되는지 검증
   - 실패 후 재호출 시 새로운 발급 시도가 이루어지는지 검증

3. **`isTokenError()` 테스트**
   - `[8005]` 에러 메시지 감지
   - `return_code` 기반 에러 감지
   - 일반 에러는 false 반환

4. **`invalidateToken()` + `refreshPromise` 초기화 테스트**
   - 진행 중인 Promise가 있을 때 `invalidateToken()` 호출 시 동작 검증

#### Stock API 테스트 (Task 3, 4)

5. **토큰 에러 시 자동 재시도 테스트**
   - 첫 번째 API 호출에서 `[8005]` 에러 반환
   - 자동으로 토큰 무효화 + 재발급 + 재시도
   - 두 번째 시도에서 성공하는지 검증

6. **재시도 1회 제한 테스트**
   - 두 번째 시도도 실패하면 에러 throw
   - `invalidateToken()` 2회 이상 호출되지 않는지 검증

7. **비토큰 에러는 재시도하지 않는 테스트**
   - 네트워크 에러, 500 에러 등은 즉시 throw
   - `invalidateToken()` 호출되지 않는지 검증

### GREEN 단계: 최소 구현

- 테스트를 통과하는 최소한의 코드 작성
- 불필요한 추상화 없이 직접적인 구현

### REFACTOR 단계: 코드 정리

- 중복 제거 (에러 처리 패턴 통합)
- 타입 안전성 강화
- @MX 태그 업데이트

---

## 마일스톤 (우선순위 기반)

### Primary Goal: P0 Race Condition 해결

- Task 1: Promise 기반 토큰 중복 제거
- 테스트: 동시 호출 Promise 공유 검증
- 결과: 동시 토큰 요청이 단일 요청으로 통합

### Secondary Goal: P1 API 레벨 토큰 재시도

- Task 2: 토큰 에러 감지 유틸리티
- Task 3: API 레벨 재시도 래퍼
- Task 4: 기존 메서드 적용
- 테스트: 토큰 에러 자동 재시도 검증
- 결과: `[8005]` 에러 시 자동 복구

---

## 리스크 분석

### 높은 리스크

| 리스크 | 영향 | 대응 방안 |
|--------|------|-----------|
| Promise dedup에서 에러 전파 누락 | 모든 대기 호출자가 에러를 받지 못함 | `finally` 블록에서 반드시 `refreshPromise = null` 설정. 에러 시 Promise reject가 모든 await에 전파되는지 테스트 |
| 무한 재시도 루프 | 서버 과부하, rate limit 초과 | 재시도 최대 1회 제한. 카운터 기반 방어 |

### 중간 리스크

| 리스크 | 영향 | 대응 방안 |
|--------|------|-----------|
| `[8005]` 외 다른 토큰 에러 코드 | 일부 토큰 에러 미감지 | `isTokenError()`에서 복수 에러 코드/패턴 지원. 알려진 에러 코드 목록 관리 |
| `fetchChart` 페이지네이션 중 토큰 만료 | 중간 페이지에서 실패 | `requestWithTokenRetry` 래핑 범위 결정 필요 (전체 페이지네이션 vs 개별 요청) |

### 낮은 리스크

| 리스크 | 영향 | 대응 방안 |
|--------|------|-----------|
| 기존 테스트 깨짐 | CI 빌드 실패 | `getAccessToken()` 인터페이스는 변경 없음. 내부 구현만 변경이므로 기존 테스트 호환 |

---

## Acceptance Criteria (EARS 형식)

### Ubiquitous 요구사항

- 시스템은 **항상** 동시에 하나의 토큰 갱신 요청만 실행해야 한다
- 시스템은 **항상** 토큰 재시도를 최대 1회로 제한해야 한다

### Event-Driven 요구사항

- **WHEN** 토큰이 만료된 상태에서 동시에 여러 API 호출이 발생하면 **THEN** 모든 호출이 동일한 토큰 갱신 Promise를 공유해야 한다
- **WHEN** API 호출에서 토큰 에러 `[8005]`가 반환되면 **THEN** 시스템이 토큰을 무효화하고 새 토큰으로 1회 재시도해야 한다
- **WHEN** 토큰 갱신 Promise가 실패하면 **THEN** 모든 대기 중인 호출자에게 에러가 전파되고 `refreshPromise`가 초기화되어야 한다

### Unwanted 요구사항

- 시스템은 토큰 에러가 아닌 일반 API 에러에 대해 자동 재시도를 **하지 않아야 한다**
- 시스템은 재시도 횟수를 1회 초과하여 **실행하지 않아야 한다**

---

## 참고: 범위 외 항목 (향후 SPEC)

- P2: HTTP 상태코드 분화 (401, 429, 503)
- P2: 로깅/모니터링 (토큰 갱신 이벤트, API 응답 시간)
- P3: Health Check 토큰 상태 보고
