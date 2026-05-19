---
id: SPEC-AUTH-001
version: 1.0.0
status: draft
created: 2026-05-19
updated: 2026-05-19
author: manager-spec
priority: High
issue_number: 0
---

# SPEC-AUTH-001: 인수 테스트 시나리오

## 인수 기준

본 SPEC의 인수 기준은 Given-When-Then 형식으로 정의한다. 모든 시나리오가 통과해야 구현이 완료된 것으로 간주한다.

---

## 시나리오 1: 회원가입 및 로그인 전체 흐름

### 1-1. 정상 회원가입

```
Given 사용자가 회원가입 페이지(/stocks/signup)에 접속한다
When 이메일 "test@example.com"과 비밀번호 "password123"을 입력하고 제출한다
Then 새 사용자 계정이 데이터베이스에 생성된다
And 비밀번호는 bcrypt로 해싱되어 저장된다
And 자동으로 로그인되어 메인 대시보드(/stocks)로 리다이렉트된다
```

**검증 항목**:
- `users` 테이블에 `email=test@example.com` 레코드 존재
- `hashedPassword` 필드가 bcrypt 해시 형식 (`$2a$12$...`)
- 평문 비밀번호가 저장되지 않음
- 세션 쿠키가 브라우저에 설정됨
- 리다이렉트 대상이 `/stocks`임

### 1-2. 중복 이메일 회원가입

```
Given 데이터베이스에 "test@example.com" 사용자가 이미 존재한다
When 동일한 이메일로 회원가입을 시도한다
Then "이미 사용 중인 이메일입니다" 오류 메시지가 표시된다
And 새 사용자 레코드가 생성되지 않는다
```

**검증 항목**:
- `users` 테이블의 해당 이메일 레코드가 정확히 1개
- 오류 메시지가 UI에 표시됨
- HTTP 응답 코드 409 Conflict

### 1-3. 유효하지 않은 입력값 회원가입

```
Given 사용자가 회원가입 페이지에 접속한다
When 이메일 "invalid-email"을 입력하고 제출한다
Then 이메일 형식 오류 메시지가 표시된다

When 비밀번호 "1234567" (7자)를 입력하고 제출한다
Then 비밀번호 길이 오류 메시지가 표시된다

When 비밀번호와 비밀번호 확인이 다를 때 제출한다
Then 비밀번호 불일치 오류 메시지가 표시된다
```

**검증 항목**:
- 클라이언트 측 유효성 검사 동작
- 서버 측 이중 검증 동작
- HTTP 응답 코드 400 Bad Request

---

## 시나리오 2: 로그인 및 세션 관리

### 2-1. 정상 로그인

```
Given 데이터베이스에 "test@example.com" 사용자가 존재한다
When 올바른 이메일과 비밀번호를 입력하고 로그인한다
Then 세션이 생성된다
And 메인 대시보드(/stocks)로 리다이렉트된다
And 네비게이션에 사용자 이메일과 로그아웃 버튼이 표시된다
```

**검증 항목**:
- `sessions` 테이블에 세션 레코드 생성
- 세션 쿠키 속성: `HttpOnly=true`, `SameSite=Lax`
- 프로덕션 환경에서 `Secure=true`
- 리다이렉트 대상이 `/stocks`임

### 2-2. 잘못된 비밀번호 로그인

```
Given 데이터베이스에 "test@example.com" 사용자가 존재한다
When 올바른 이메일과 잘못된 비밀번호를 입력하고 로그인한다
Then "이메일 또는 비밀번호가 올바르지 않습니다" 오류 메시지가 표시된다
And 세션이 생성되지 않는다
```

**검증 항목**:
- 오류 메시지가 계정 존재 여부를 노출하지 않음
- `sessions` 테이블에 새 레코드 없음
- HTTP 응답 코드 401

### 2-3. 존재하지 않는 이메일 로그인

```
Given 데이터베이스에 "nonexistent@example.com" 사용자가 존재하지 않는다
When 해당 이메일과 임의의 비밀번호로 로그인을 시도한다
Then "이메일 또는 비밀번호가 올바르지 않습니다" 오류 메시지가 표시된다
```

**검증 항목**:
- 존재하지 않는 이메일과 잘못된 비밀번호의 오류 메시지가 동일함
- 응답 시간이 유사함 (타이밍 공격 방지)

### 2-4. 로그아웃

```
Given 사용자가 로그인된 상태이다
When 로그아웃 버튼을 클릭한다
Then 세션이 파기된다
And 로그인 페이지(/stocks/login)로 리다이렉트된다
```

**검증 항목**:
- `sessions` 테이블에서 해당 세션 레코드 삭제
- 세션 쿠키 제거
- 리다이렉트 대상이 `/stocks/login`임

### 2-5. 세션 지속성

```
Given 사용자가 로그인된 상태이다
When 브라우저를 닫았다가 다시 연다
Then 세션이 유지되어 메인 대시보드에 접근 가능하다
```

**검증 항목**:
- 데이터베이스 세션 기반 지속성
- 세션 만료 전까지 로그인 유지

---

## 시나리오 3: 라우트 보호

### 3-1. 미인증 사용자 리다이렉트

```
Given 사용자가 로그인하지 않은 상태이다
When 메인 대시보드(/stocks)에 접근한다
Then 로그인 페이지(/stocks/login)로 리다이렉트된다
```

**검증 항목**:
- 미들웨어가 `/stocks` 요청을 가로챔
- 307 Temporary Redirect 응답
- 리다이렉트 대상: `/stocks/login`

### 3-2. 미인증 사용자 공개 페이지 접근

```
Given 사용자가 로그인하지 않은 상태이다
When 로그인 페이지(/stocks/login)에 접근한다
Then 로그인 페이지가 정상 표시된다
```

**검증 항목**:
- 공개 라우트 목록의 모든 페이지가 정상 접근 가능

### 3-3. 인증된 사용자 로그인 페이지 접근

```
Given 사용자가 로그인된 상태이다
When 로그인 페이지(/stocks/login)에 접근한다
Then 메인 대시보드(/stocks)로 리다이렉트된다
```

---

## 시나리오 4: API 보안

### 4-1. 미인증 API 요청

```
Given 사용자가 로그인하지 않은 상태이다
When 관심종목 API(/api/watchlist)에 GET 요청을 보낸다
Then 401 Unauthorized 응답이 반환된다
```

**검증 항목**:
- 응답 상태 코드 401
- 응답 본문에 오류 메시지 포함

### 4-2. 인증된 API 요청

```
Given 사용자가 "test@example.com"으로 로그인된 상태이다
And 해당 사용자의 관심종목이 3개 존재한다
When 관심종목 API(/api/watchlist)에 GET 요청을 보낸다
Then 해당 사용자의 관심종목 3개가 반환된다
```

**검증 항목**:
- 세션 사용자 ID와 일치하는 Watchlist만 반환
- 다른 사용자의 데이터가 포함되지 않음

### 4-3. 소유자 불일치

```
Given 사용자 A가 로그인된 상태이다
And 사용자 B의 관심종목 ID가 "watchlist-123"이다
When 사용자 A가 /api/watchlist/watchlist-123에 DELETE 요청을 보낸다
Then 403 Forbidden 응답이 반환된다
```

---

## 엣지 케이스 테스트

### EC-001: 매우 긴 이메일 입력

```
Given 255자를 초과하는 이메일 주소
When 회원가입을 시도
Then 적절한 오류 메시지 표시
```

### EC-002: 특수문자가 포함된 비밀번호

```
Given "!@#$%^&*()_+-=[]{}|;':\",./<>?" 비밀번호
When 회원가입 시도
Then 정상 가입 및 로그인 가능
```

### EC-003: 동시 로그인 세션

```
Given 동일 계정으로 두 브라우저에서 로그인
When 한 브라우저에서 로그아웃
Then 다른 브라우저 세션은 영향을 받지 않음 (또는 정책에 따라 무효화)
```

### EC-004: 세션 만료 후 API 호출

```
Given 사용자의 세션이 만료됨
When 클라이언트에서 Watchlist API 호출
Then 401 응답 후 로그인 페이지로 리다이렉트
```

### EC-005: 빈 비밀번호 제출

```
Given 빈 비밀번호 문자열
When 로그인 시도
Then 적절한 오류 메시지 (빈 필드 검증)
```

### EC-006: 대소문자 이메일

```
Given "Test@Example.COM"으로 가입한 사용자
When "test@example.com"으로 로그인 시도
Then 정상 로그인 가능 (이메일 대소문자 정규화)
```

---

## 보안 테스트 (OWASP)

### SEC-001: SQL Injection 방어

```
Given 악의적인 SQL이 포함된 이메일 "' OR '1'='1"
When 로그인 시도
Then 인증이 우회되지 않음
And Prisma 파라미터화된 쿼리로 안전하게 처리됨
```

### SEC-002: XSS 방어

```
Given 스크립트가 포함된 이메일 "<script>alert('xss')</script>@test.com"
When 회원가입 시도
Then 스크립트가 실행되지 않음
And 입력값이 적절히 이스케이프됨
```

### SEC-003: 세션 하이재킹 방어

```
Given 프로덕션 환경
When 세션 쿠키가 설정됨
Then 쿠키 속성이 HttpOnly=true, Secure=true, SameSite=Lax임
```

### SEC-004: 무차별 대입 공격 완화

```
Given 동일 이메일로 10회 연속 잘못된 비밀번호 로그인 시도
When 매 시도마다
Then bcrypt 해싱으로 인해 응답 시간이 일정함
And 타이밍 기반 공격이 방지됨
```

**참고**: Rate Limiting은 본 SPEC 범위 외이나, bcrypt의 연산 비용이 기본적인 완화를 제공함.

### SEC-005: CSRF 보호

```
Given 타 사이트에서의 인증 요청
When NextAuth CSRF 토큰 없이 요청
Then 요청이 거부됨
```

---

## 성능 기준

| 항목 | 기준 | 측정 방법 |
|------|------|-----------|
| 로그인 응답 시간 (P95) | 2초 이내 | Vitest 벤치마크 또는 수동 측정 |
| 회원가입 응답 시간 (P95) | 2초 이내 | Vitest 벤치마크 또는 수동 측정 |
| 미들웨어 세션 검증 | 50ms 이내 | 단위 테스트 |
| 비밀번호 해싱 (bcrypt cost=12) | ~200ms | 단위 테스트 |

---

## 품질 게이트 (Definition of Done)

### TRUST 5 검증

| 항목 | 기준 | 상태 |
|------|------|------|
| **Tested** | 인증 모듈 85%+ 커버리지 | [ ] |
| **Tested** | 모든 Given-When-Then 시나리오 통과 | [ ] |
| **Readable** | ESLint 경고 0건 | [ ] |
| **Unified** | TypeScript strict 모드 통과 | [ ] |
| **Secured** | OWASP 보안 테스트 5건 통과 | [ ] |
| **Secured** | bcrypt 비밀번호 해싱 검증 | [ ] |
| **Secured** | 세션 쿠키 보안 속성 확인 | [ ] |
| **Trackable** | Conventional commit 메시지 | [ ] |

### 기능 검증

| 항목 | 기준 | 상태 |
|------|------|------|
| 회원가입 정상 동작 | 유효한 입력으로 계정 생성 | [ ] |
| 로그인 정상 동작 | 올바른 자격증명으로 세션 생성 | [ ] |
| 로그아웃 정상 동작 | 세션 파기 및 리다이렉트 | [ ] |
| 라우트 보호 | 미인증 시 /stocks/login 리다이렉트 | [ ] |
| API 보호 | 미인증 시 401 응답 | [ ] |
| basePath 호환 | 모든 URL이 /stocks prefix 포함 | [ ] |
| 데이터 마이그레이션 | demo -> admin 관심종목 이관 | [ ] |
| 기존 테스트 회귀 | 전체 테스트 스위트 통과 | [ ] |
| 프로덕션 빌드 | `npm run build:prod` 성공 | [ ] |

### 배포 검증

| 항목 | 기준 | 상태 |
|------|------|------|
| 환경 변수 | AUTH_SECRET, AUTH_URL 서버 설정 | [ ] |
| DB 마이그레이션 | Prisma 마이그레이션 서버 적용 | [ ] |
| HTTPS 동작 | Secure 쿠키 정상 설정 | [ ] |
| 관리자 계정 | admin@example.com 로그인 가능 | [ ] |
