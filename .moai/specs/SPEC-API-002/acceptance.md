---
id: SPEC-API-002
document: acceptance
version: "1.0.0"
created: "2026-03-10"
updated: "2026-03-10"
author: 강력쇠주먹
---

# SPEC-API-002: Acceptance Criteria (수락 기준)

## 1. Promise 기반 토큰 중복 제거 (P0)

### 1.1 REQ-U01, REQ-E01: 동시 호출 시 단일 토큰 갱신

**Scenario 1: 토큰 만료 상태에서 동시 3회 호출**

```gherkin
Given 토큰이 만료된 상태이다
  And fetchToken mock이 100ms 후 새 토큰 "new-token-abc"를 반환하도록 설정되어 있다
When getAccessToken()이 동시에 3번 호출된다 (Promise.all)
Then 3개의 반환값이 모두 "new-token-abc"이다
  And fetchToken mock이 정확히 1회만 호출되었다
```

**Scenario 2: 순차 호출 시 정상 동작 유지**

```gherkin
Given 토큰이 만료된 상태이다
When getAccessToken()이 순차적으로 2번 호출된다 (첫 번째 완료 후 두 번째)
Then 첫 번째 호출에서 fetchToken이 1회 호출된다
  And 두 번째 호출에서 캐시된 토큰이 반환된다 (추가 fetchToken 없음)
```

**Scenario 3: 대량 동시 호출**

```gherkin
Given 토큰이 만료된 상태이다
  And fetchToken mock이 200ms 지연 후 토큰을 반환한다
When getAccessToken()이 동시에 10번 호출된다 (Promise.all)
Then 10개의 반환값이 모두 동일한 토큰이다
  And fetchToken mock이 정확히 1회만 호출되었다
```

### 1.2 REQ-S01: refreshPromise 상태 기반 분기

**Scenario 4: refreshPromise 존재 시 기존 Promise 재사용**

```gherkin
Given 토큰이 만료된 상태이다
  And 첫 번째 getAccessToken() 호출이 진행 중이다 (Promise 미완료)
When 두 번째 getAccessToken()이 호출된다
Then 두 번째 호출은 첫 번째와 동일한 Promise를 반환한다
  And 새로운 fetchToken 호출이 발생하지 않는다
```

**Scenario 5: refreshPromise 완료 후 새 호출은 캐시 사용**

```gherkin
Given 토큰이 만료된 상태이다
  And getAccessToken()이 호출되어 새 토큰이 발급 완료되었다
When 다시 getAccessToken()이 호출된다
Then refreshPromise는 null이다
  And 캐시된 토큰이 즉시 반환된다 (fetchToken 미호출)
```

### 1.3 REQ-E02: Promise 실패 시 에러 전파 및 초기화

**Scenario 6: 토큰 발급 실패 시 모든 대기자에게 에러 전파**

```gherkin
Given 토큰이 만료된 상태이다
  And fetchToken mock이 "서버 에러" 에러를 throw하도록 설정되어 있다
  And MAX_RETRIES 후에도 실패한다
When getAccessToken()이 동시에 3번 호출된다
Then 3개의 호출 모두 "서버 에러" 에러로 reject된다
  And refreshPromise가 null로 초기화되었다
```

**Scenario 7: 실패 후 재호출 시 새로운 발급 시도**

```gherkin
Given 이전 getAccessToken() 호출이 에러로 실패했다
  And refreshPromise가 null로 초기화된 상태이다
  And fetchToken mock이 이번에는 성공하도록 변경되었다
When getAccessToken()이 다시 호출된다
Then 새로운 fetchTokenWithRetry()가 실행된다
  And 유효한 토큰이 반환된다
```

### 1.4 REQ-E05: invalidateToken() 확장

**Scenario 8: invalidateToken() 호출 시 세 필드 모두 초기화**

```gherkin
Given 유효한 토큰이 캐시되어 있다
  And refreshPromise는 null이다
When invalidateToken()이 호출된다
Then accessToken이 null이다
  And tokenExpiresAt이 null이다
  And refreshPromise가 null이다
```

**Scenario 9: 토큰 갱신 중 invalidateToken() 호출**

```gherkin
Given 토큰 갱신이 진행 중이다 (refreshPromise !== null)
When invalidateToken()이 호출된다
Then accessToken이 null이다
  And tokenExpiresAt이 null이다
  And refreshPromise가 null이다
```

### 1.5 REQ-S02: 기존 캐시 동작 유지

**Scenario 10: 유효한 토큰이 있으면 즉시 반환**

```gherkin
Given 유효한 토큰 "cached-token"이 캐시되어 있다
  And 토큰 만료까지 10분 이상 남아있다
When getAccessToken()이 호출된다
Then "cached-token"이 즉시 반환된다
  And fetchToken이 호출되지 않는다
  And refreshPromise는 null 상태를 유지한다
```

---

## 2. 토큰 에러 감지 유틸리티 (P1 기반)

### 2.1 REQ-N02: isTokenError() 감지 패턴

**Scenario 11: [8005] 에러 메시지 감지**

```gherkin
Given Error 객체의 message가 "Token이 유효하지 않습니다[8005]"이다
When KiwoomTokenManager.isTokenError(error)가 호출된다
Then true가 반환된다
```

**Scenario 12: return_code 기반 토큰 에러 감지**

```gherkin
Given Error 객체의 message가 "토큰 관련 에러: [8005]"이다
When KiwoomTokenManager.isTokenError(error)가 호출된다
Then true가 반환된다
```

**Scenario 13: [8001] 키 검증 실패는 토큰 에러가 아님**

```gherkin
Given Error 객체의 message가 "App Key와 Secret Key 검증 실패[8001]"이다
When KiwoomTokenManager.isTokenError(error)가 호출된다
Then false가 반환된다
```

**Scenario 14: 일반 네트워크 에러는 토큰 에러가 아님**

```gherkin
Given Error 객체의 message가 "Network Error"이다
When KiwoomTokenManager.isTokenError(error)가 호출된다
Then false가 반환된다
```

**Scenario 15: 일반 API 에러 (return_code !== 0)는 토큰 에러가 아님**

```gherkin
Given Error 객체의 message가 "종목 시세 조회 실패: 존재하지 않는 종목"이다
When KiwoomTokenManager.isTokenError(error)가 호출된다
Then false가 반환된다
```

**Scenario 16: null/undefined 인풋 처리**

```gherkin
Given null이 전달된다
When KiwoomTokenManager.isTokenError(null)이 호출된다
Then false가 반환된다
```

---

## 3. API 레벨 토큰 재시도 (P1)

### 3.1 REQ-E03: 토큰 에러 시 자동 재시도

**Scenario 17: [8005] 에러 후 재시도 성공 (fetchStockDetail)**

```gherkin
Given fetchStockDetail("005930")이 호출된다
  And 첫 번째 API 호출에서 "[8005]" 에러가 발생한다
  And 토큰 무효화 후 새 토큰으로 두 번째 API 호출은 성공한다
When fetchStockDetail("005930")의 결과가 반환된다
Then 유효한 StockDetail 객체가 반환된다
  And invalidateToken()이 1회 호출되었다
  And getAccessToken()이 2회 호출되었다 (초기 + 재시도)
```

**Scenario 18: [8005] 에러 후 재시도 성공 (fetchChart)**

```gherkin
Given fetchChart("005930", "ka10081", {})이 호출된다
  And 첫 번째 API 호출에서 "[8005]" 에러가 발생한다
  And 토큰 무효화 후 새 토큰으로 두 번째 API 호출은 성공한다
When fetchChart()의 결과가 반환된다
Then 유효한 ChartData 객체가 반환된다
  And invalidateToken()이 1회 호출되었다
```

**Scenario 19: [8005] 에러 후 재시도 성공 (fetchMarketStocks)**

```gherkin
Given fetchMarketStocks("KOSPI")이 호출된다
  And 첫 번째 API 호출에서 "[8005]" 에러가 발생한다
  And 토큰 무효화 후 새 토큰으로 두 번째 API 호출은 성공한다
When fetchMarketStocks()의 결과가 반환된다
Then 유효한 StockInfo[] 배열이 반환된다
  And invalidateToken()이 1회 호출되었다
```

### 3.2 REQ-E04, REQ-U02: 재시도 1회 제한

**Scenario 20: 두 번째 시도도 [8005] 에러면 throw**

```gherkin
Given fetchStockDetail("005930")이 호출된다
  And 첫 번째 API 호출에서 "[8005]" 에러가 발생한다
  And 두 번째 API 호출에서도 "[8005]" 에러가 발생한다
When fetchStockDetail()이 실행된다
Then "[8005]" 에러가 throw된다
  And invalidateToken()이 최대 1회만 호출되었다
  And 세 번째 API 호출은 발생하지 않는다
```

**Scenario 21: 재시도 후 다른 에러 발생 시 해당 에러 throw**

```gherkin
Given fetchStockDetail("005930")이 호출된다
  And 첫 번째 API 호출에서 "[8005]" 에러가 발생한다
  And 두 번째 API 호출에서 "서버 내부 에러"가 발생한다
When fetchStockDetail()이 실행된다
Then "서버 내부 에러"가 throw된다
```

### 3.3 REQ-N01: 비토큰 에러는 재시도 없음

**Scenario 22: 네트워크 에러는 즉시 throw**

```gherkin
Given fetchStockDetail("005930")이 호출된다
  And API 호출에서 "Network Error"가 발생한다
When fetchStockDetail()이 실행된다
Then "Network Error"가 즉시 throw된다
  And invalidateToken()이 호출되지 않는다
  And API 호출이 1회만 발생한다
```

**Scenario 23: 일반 비즈니스 에러는 즉시 throw**

```gherkin
Given fetchStockDetail("INVALID")이 호출된다
  And API 호출에서 return_code !== 0 (비토큰 에러)가 반환된다
When fetchStockDetail()이 실행된다
Then 비즈니스 에러가 즉시 throw된다
  And invalidateToken()이 호출되지 않는다
```

**Scenario 24: timeout 에러는 즉시 throw**

```gherkin
Given fetchStockDetail("005930")이 호출된다
  And API 호출에서 timeout 에러가 발생한다
When fetchStockDetail()이 실행된다
Then timeout 에러가 즉시 throw된다
  And invalidateToken()이 호출되지 않는다
```

---

## 4. Edge Case 시나리오

### 4.1 동시성 + 재시도 복합

**Scenario 25: 동시 API 호출 중 하나가 [8005] 에러**

```gherkin
Given fetchStockDetail("005930")과 fetchChart("005930", "ka10081", {})이 동시에 호출된다
  And fetchStockDetail에서 "[8005]" 에러가 발생한다
  And fetchChart는 정상 성공한다
When 두 호출이 완료된다
Then fetchStockDetail은 재시도 후 성공한다
  And fetchChart는 첫 시도에서 성공한다
  And invalidateToken()은 fetchStockDetail에서만 호출된다
```

### 4.2 Promise dedup 경계 조건

**Scenario 26: refreshPromise 완료 직후 동시 호출**

```gherkin
Given 토큰 갱신 Promise가 방금 완료되었다 (refreshPromise가 null로 전환 중)
When 즉시 getAccessToken()이 호출된다
Then 캐시된 새 토큰이 반환된다 (isTokenValid() === true)
  And 새로운 fetchToken 호출이 발생하지 않는다
```

### 4.3 입력 검증

**Scenario 27: 빈 종목코드 시 토큰 재시도 불필요**

```gherkin
Given fetchStockDetail("")이 호출된다
When 입력 검증이 실행된다
Then "종목코드는 필수입니다" 에러가 즉시 throw된다
  And getAccessToken()이 호출되지 않는다
  And invalidateToken()이 호출되지 않는다
```

---

## 5. Performance Criteria (성능 기준)

| 항목 | 기준 |
|------|------|
| 동시 호출 시 추가 HTTP 요청 | 0건 (단일 in-flight 요청만 허용) |
| 토큰 재시도 최대 횟수 | 1회 |
| 기존 API 응답 시간 증가 | 정상 경로에서 0ms (추가 오버헤드 없음) |
| 재시도 경로 추가 지연 | 토큰 재발급 시간만큼 (약 1-3초) |

---

## 6. Quality Gate Criteria (품질 게이트)

### 6.1 테스트 커버리지

| 파일 | 최소 커버리지 |
|------|--------------|
| `kiwoom-token-manager.ts` | 85% 이상 |
| `kiwoom-stock-api.ts` | 85% 이상 |
| 전체 프로젝트 | 85% 이상 (기존 수준 유지) |

### 6.2 TDD 준수

- 모든 새 기능은 RED (실패 테스트) -> GREEN (최소 구현) -> REFACTOR 순서로 개발
- 테스트 파일이 구현 파일보다 먼저 수정되어야 한다

### 6.3 TRUST 5 체크리스트

| 항목 | 기준 |
|------|------|
| **Tested** | 85%+ 커버리지, 동시성 테스트 포함 |
| **Readable** | ESLint 경고 0건, 한국어 코드 주석 |
| **Unified** | 기존 코드 스타일 일관성 유지 |
| **Secured** | 토큰 정보 로그 미출력, 에러 메시지에 토큰 미포함 |
| **Trackable** | Conventional Commit, SPEC-API-002 참조 |

### 6.4 기존 테스트 호환성

- 기존 62개 테스트 모두 통과 (regression 없음)
- `getAccessToken()` 공개 인터페이스 변경 없음
- `KiwoomStockAPI` 공개 메서드 시그니처 변경 없음

---

## 7. Definition of Done (완료 정의)

- [ ] P0: `getAccessToken()` Promise 기반 중복 제거 구현 완료
- [ ] P0: 동시 호출 테스트 통과 (Scenario 1-3)
- [ ] P0: 실패 시 에러 전파 테스트 통과 (Scenario 6-7)
- [ ] P0: `invalidateToken()` 확장 테스트 통과 (Scenario 8-9)
- [ ] P1: `isTokenError()` 구현 및 테스트 통과 (Scenario 11-16)
- [ ] P1: `requestWithTokenRetry()` 구현 완료
- [ ] P1: 3개 API 메서드에 재시도 래퍼 적용 완료
- [ ] P1: 토큰 재시도 테스트 통과 (Scenario 17-24)
- [ ] 기존 62개 테스트 모두 통과
- [ ] 전체 테스트 커버리지 85% 이상
- [ ] TypeScript strict 모드 에러 0건
- [ ] ESLint 경고 0건
