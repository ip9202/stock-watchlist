# SPEC-API-002 Research: 토큰 만료 처리 전략

## 1. 현재 토큰 라이프사이클

### 1.1 토큰 획득
- **파일:** `src/lib/kiwoom-token-manager.ts`
- **싱글톤 패턴**: 전체 앱에서 단일 `KiwoomTokenManager` 인스턴스 공유 (라인 10-11)
- **OAuth2 Bearer Token**: `client_credentials` grant type (라인 129)
- **엔드포인트**: `https://api.kiwoom.com/oauth2/token`
- **타임아웃**: 10초 (라인 16)
- **환경변수 필수**: `KIWOOM_APP_KEY`, `KIWOOM_SECRET_KEY` (라인 35-42)

### 1.2 토큰 캐싱
- **유효성 체크**: `isTokenValid()` (라인 87-96)
- **갱신 마진**: 만료 5분 전 갱신 시작 (`TOKEN_REFRESH_MARGIN = 300초`, 라인 14)
- **기본 TTL**: 24시간 (`DEFAULT_TOKEN_EXPIRY = 86400초`, 라인 15)
- **저장**: `this.tokenExpiresAt = Date.now() + expiresIn * 1000` (라인 156)

### 1.3 재시도 로직
- **최대 재시도**: 3회 (`MAX_RETRIES = 3`, 라인 17)
- **백오프**: 선형 지수 (1초, 2초, 3초 = 최대 6초, 라인 109)
- **실패 시**: 에러 throw

### 1.4 토큰 사용 포인트
| 메서드 | 파일 | 라인 | API ID |
|--------|------|------|--------|
| `fetchStockList()` | kiwoom-stock-api.ts | 358 | ka10099 |
| `fetchStockDetail()` | kiwoom-stock-api.ts | 151 | ka10001 |
| `fetchChart()` | kiwoom-stock-api.ts | 214 | ka10081/ka10082 |

---

## 2. 갭 분석 (Gap Analysis)

### 2.1 동시성 문제 (CRITICAL - P0)
- **문제**: 토큰 만료 시 다중 요청이 동시에 `fetchTokenWithRetry()` 호출
- **원인**: in-flight 토큰 발급 요청 추적 없음, Promise 대기 로직 부재
- **영향**: 불필요한 중복 토큰 발급, API rate limit 위험
- **테스트 부재**: 동시 요청 시나리오 미검증

### 2.2 토큰 만료 후 API 재시도 없음 (HIGH - P1)
- **문제**: API 호출 중 토큰 만료 시 에러를 그대로 클라이언트에 전파
- **코드**: `kiwoom-stock-api.ts` 라인 165-166 - 모든 `return_code !== 0`을 동일하게 처리
- **에러 코드**: `[8005]` 토큰 무효, `[8001]` 키 검증 실패 — 구분 처리 없음
- **필요**: 토큰 에러 감지 → 토큰 무효화 → 1회 자동 재시도

### 2.3 HTTP 상태 코드 미활용 (MEDIUM - P2)
- **현재**: 모든 API 에러를 HTTP 500으로 반환
- **필요**: 401 (토큰 만료), 429 (속도 제한), 503 (서비스 불가) 구분

### 2.4 로깅/모니터링 부재 (MEDIUM - P2)
- **누락**: 토큰 갱신 이벤트, 재시도 횟수, API 응답 시간

### 2.5 헬스 체크에 토큰 상태 없음 (LOW - P3)
- **현재**: `/api/health`에 토큰 상태 미포함

---

## 3. 참조 구현 (Reference Implementations)

### 3.1 재시도 패턴
- `kiwoom-token-manager.ts` 라인 101-119: `fetchTokenWithRetry()` — 지수 백오프 재시도
- API 호출에도 동일 패턴 적용 가능

### 3.2 캐싱 패턴
- `cache.ts`: TTL 기반 인메모리 캐시 — 토큰 캐시에도 적용 가능

### 3.3 싱글톤 패턴
- `KiwoomTokenManager`: 이미 싱글톤 — Promise 기반 동시성 보호 추가 적합

---

## 4. 위험 영역

1. **Race Condition** (최우선): `getAccessToken()` 동시 호출 시 중복 토큰 발급
2. **토큰 만료 중 API 호출** (높음): 요청-토큰 간 타이밍 불일치
3. **토큰 발급 타임아웃** (중간): 최대 16초 대기 가능 (10초 + 3회 재시도 6초)

---

## 5. 핵심 파일 목록

- `src/lib/kiwoom-token-manager.ts` — 토큰 관리 (수정 대상)
- `src/lib/kiwoom-stock-api.ts` — API 클라이언트 (수정 대상)
- `src/app/api/stocks/route.ts` — 검색 API 라우트
- `src/app/api/stocks/[symbol]/route.ts` — 시세 API 라우트
- `src/app/api/stocks/[symbol]/chart/route.ts` — 차트 API 라우트
- `src/lib/cache.ts` — 캐시 레이어
- `src/lib/__tests__/kiwoom-token-manager.test.ts` — 토큰 테스트
- `src/lib/__tests__/kiwoom-stock-api.test.ts` — API 테스트
