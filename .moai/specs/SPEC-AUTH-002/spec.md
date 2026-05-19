---
id: SPEC-AUTH-002
version: 1.1.0
status: completed
created: 2026-05-19
updated: 2026-05-19
author: manager-spec
priority: High
issue_number: 3
---

# SPEC-AUTH-002: 인증 시스템 보안 강화

## HISTORY

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-05-19 | 1.0.0 | 최초 작성 | manager-spec |

---

## 개요

SPEC-AUTH-001로 구현된 이메일/비밀번호 인증 시스템의 보안 취약점을 해결한다. Rate Limiting으로 무차별 대입 공격을 방어하고, 이메일 열거 공격을 차단하며, 비밀번호 복잡성을 강화하여 전체 인증 보안 태세를 높인다.

**선행 SPEC**: SPEC-AUTH-001 (이메일/비밀번호 인증 시스템, completed)
**기반 아키텍처**: NextAuth.js v5 + Credentials Provider + Prisma Adapter
**배포 환경**: PM2 standalone (단일 인스턴스, in-memory rate limiting)

---

## 요구사항

### Rate Limiting 요구사항

#### REQ-AUTH-201: 로그인 시도 제한 (Event-Driven)

무차별 대입 공격을 방지하기 위해 로그인 시도 횟수를 제한한다.

- **When** 동일한 IP 주소와 이메일 조합으로 5분 이내에 5회 이상 로그인에 실패하면, 시스템은 **shall** 429 Too Many Requests 상태 코드를 반환하고 후속 로그인 시도를 차단한다.
- **When** Rate Limit이 활성화된 상태에서 추가 로그인 시도가 발생하면, 시스템은 **shall** 제한 해제까지 남은 시간(초)을 응답 본문에 포함한다.
- **When** Rate Limit 윈도우(5분)가 만료되면, 시스템은 **shall** 자동으로 카운터를 초기화하고 새로운 로그인 시도를 허용한다.

#### REQ-AUTH-202: 회원가입 시도 제한 (Event-Driven)

자동화된 대량 계정 생성을 방지하기 위해 회원가입 시도 횟수를 제한한다.

- **When** 동일한 IP 주소에서 1시간 이내에 3회 이상 회원가입을 시도하면, 시스템은 **shall** 429 Too Many Requests 상태 코드를 반환한다.
- **When** 회원가입 Rate Limit이 활성화되면, 시스템은 **shall** 제한 해제까지 남은 시간(초)을 응답 본문에 포함한다.

#### REQ-AUTH-203: Rate Limit 상태 관리 (State-Driven)

- **While** Rate Limit이 활성 상태이면, 시스템은 **shall** 클라이언트에게 `Retry-After` 헤더와 JSON 응답 본문 모두에 남은 시간을 표시한다.
- 시스템은 **shall** in-memory Map으로 Rate Limit 상태를 관리하며, 만료된 엔트리를 주기적으로 정리한다.

---

### 이메일 열거 방지 요구사항

#### REQ-AUTH-204: 회원가입 이메일 열거 차단 (Unwanted Behavior)

이미 가입된 이메일로 회원가입 시도 시 계정 존재 여부를 공격자에게 노출하지 않는다.

- **If** 이미 존재하는 이메일로 회원가입이 시도되면, 시스템은 **shall** 409 Conflict 대신 200 OK 상태 코드를 반환한다.
- **If** 중복 이메일이 감지되면, 시스템은 **shall** 새 계정을 생성하지 않고 정상 응답과 동일한 형식으로 응답한다.
- **If** 중복 이메일이 감지되면, 시스템은 **shall** 보안 모니터링을 위해 서버 로그에 해당 시도를 기록한다.

> **Delta**: `src/app/api/auth/signup/route.ts`의 409 응답 경로를 200 OK 응답으로 변경. 기존 `existingUser` 체크 로직 유지하되 응답 형식만 수정.

---

### 비밀번호 복잡성 요구사항

#### REQ-AUTH-205: 비밀번호 최소 길이 강화 (Ubiquitous)

- 시스템은 **shall** 모든 새 비밀번호에 대해 최소 12자 길이를 요구한다 (기존 8자에서 강화).
- 시스템은 **shall** 기존 사용자의 비밀번호에 대해 소급적용하지 않는다 (로그인 시 강제 변경 없음).

> **Delta**: `src/app/api/auth/signup/route.ts`의 `password.length < 8` 검증을 `password.length < 12`로 변경.

#### REQ-AUTH-206: 비밀번호 문자 종류 검증 (Event-Driven)

- **When** 새 비밀번호가 제출되면, 시스템은 **shall** 다음 4가지 문자 종류 중 최소 3가지 이상 포함 여부를 검증한다:
  - 대문자 (A-Z)
  - 소문자 (a-z)
  - 숫자 (0-9)
  - 특수문자 (!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/? 등)
- **When** 비밀번호가 복잡성 요구사항을 충족하지 못하면, 시스템은 **shall** 어떤 종류가 부족한지 구체적으로 안내하는 오류 메시지를 반환한다.

#### REQ-AUTH-207: 비밀번호 강도 실시간 평가 (Optional)

- **Where** zxcvbn-ts 라이브러리를 사용할 수 있으면, 시스템은 **shall** 회원가입 폼에서 비밀번호 입력 시 실시간 강도 평가를 제공한다.
- 시스템은 **shall** zxcvbn 점수를 기반으로 "약"/"보통"/"강"/"매우 강" 4단계로 강도를 시각적으로 표시한다.
- 시스템은 **shall** zxcvbn이 감지하는 일반적인 약한 패턴(예: "password123", 키보드 패턴)에 대해 경고를 표시한다.

---

### 비기능 요구사항

#### REQ-AUTH-208: 성능 영향 최소화

- Rate Limit 검증은 **shall** P95 기준 1ms 이내에 완료된다 (in-memory 조회).
- 비밀번호 복잡성 검증은 **shall** P95 기준 5ms 이내에 완료된다 (zxcvbn 평가 포함).
- 기존 220개 테스트는 **shall** 모두 통과한다 (회귀 없음).

#### REQ-AUTH-209: Rate Limit 메모리 관리

- 시스템은 **shall** 만료된 Rate Limit 엔트리를 1분마다 자동 정리한다.
- 시스템은 **shall** Rate Limit Map의 최대 엔트리 수를 10,000개로 제한하여 메모리 누수를 방지한다.

#### REQ-AUTH-210: 테스트 커버리지

- 신규 보안 모듈(rate-limit.ts, password-validator.ts)의 테스트 커버리지는 **shall** 90% 이상이다.
- 테스트는 **shall** Rate Limit 만료, 동시 요청, 경계값 시나리오를 포함한다.

---

## 인수 기준 요약

| ID | 기준 | 검증 방법 |
|----|------|-----------|
| AC-201 | 5분/5회 로그인 Rate Limit 동작 | 단위 + 통합 테스트 |
| AC-202 | 1시간/3회 회원가입 Rate Limit 동작 | 단위 + 통합 테스트 |
| AC-203 | Rate Limit 응답에 Retry-After + 남은 시간 포함 | 단위 테스트 |
| AC-204 | 중복 이메일 회원가입 시 200 OK 반환 (409 아님) | 단위 테스트 |
| AC-205 | 비밀번호 최소 12자 검증 | 단위 테스트 |
| AC-206 | 비밀번호 4종류 중 3종류 이상 포함 검증 | 단위 테스트 |
| AC-207 | zxcvbn 실시간 강도 평가 UI 표시 | 컴포넌트 테스트 |
| AC-208 | 기존 220개 테스트 회귀 없음 | 전체 테스트 스위트 |
| AC-209 | Rate Limit 만료 엔트리 자동 정리 | 단위 테스트 |
| AC-210 | 신규 모듈 90%+ 커버리지 | 커버리지 리포트 |

---

## 수정 파일 목록

### 신규 파일

| 파일 경로 | 설명 |
|-----------|------|
| `src/lib/rate-limit.ts` | In-memory Rate Limiting 유틸리티 |
| `src/lib/password-validator.ts` | 비밀번호 복잡성 검증 + zxcvbn 통합 |
| `src/lib/__tests__/rate-limit.test.ts` | Rate Limiter 단위 테스트 |
| `src/lib/__tests__/password-validator.test.ts` | 비밀번호 검증 단위 테스트 |
| `src/components/auth/PasswordStrengthIndicator.tsx` | 비밀번호 강도 시각화 컴포넌트 |
| `src/components/auth/__tests__/PasswordStrengthIndicator.test.tsx` | 강도 표시 컴포넌트 테스트 |

### 수정 파일

| 파일 경로 | 변경 내용 |
|-----------|-----------|
| `src/app/api/auth/signup/route.ts` | [DELTA] Rate Limit 미들웨어 적용, 409→200 응답 변경, 비밀번호 12자+복잡성 검증 |
| `src/lib/auth.ts` | [DELTA] `authorizeCredentials`에 Rate Limit 체크 추가 |
| `src/components/auth/SignupForm.tsx` | [DELTA] 비밀번호 12자 안내, 강도 표시 컴포넌트 추가 |
| `src/components/auth/LoginForm.tsx` | [DELTA] 429 응답 처리, Rate Limit 메시지 표시 |
| `src/app/api/auth/signup/__tests__/route.test.ts` | [DELTA] Rate Limit + 이메일 열거 + 복잡성 테스트 케이스 추가 |
| `src/lib/__tests__/auth.test.ts` | [DELTA] Rate Limit 통합 테스트 케이스 추가 |
| `package.json` | [DELTA] `@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en` 의존성 추가 |

---

## MX 태그 계획

| 파일 | 태그 | 대상 | 이유 |
|------|------|------|------|
| `src/lib/auth.ts` | @MX:ANCHOR | `authorizeCredentials` | 기존 태그 유지, Rate Limit 체크 추가로 fan_in 유지 |
| `src/lib/rate-limit.ts` | @MX:WARN | `checkRateLimit` | 글로벌 Map 상태 뮤테이션, 동시성 주의 |
| `src/lib/rate-limit.ts` | @MX:NOTE | Rate Limit 상수 | 보안 설정값 (5분/5회, 1시간/3회) |
| `src/lib/password-validator.ts` | @MX:NOTE | 복잡성 상수 | 보안 설정값 (12자, 3종류) |
| `src/app/api/auth/signup/route.ts` | @MX:NOTE | 이메일 열거 방지 로직 | 의도적으로 200 OK 반환하는 보안 로직 |

---

## 제외 항목 (What NOT to Build)

다음 기능은 본 SPEC의 범위에서 명시적으로 제외한다:

1. **분산 Rate Limiting (Redis/Memcached)** - 단일 PM2 인스턴스 환경이므로 in-memory로 충분. 다중 인스턴스 확장 시 별도 SPEC 필요.
2. **CAPTCHA 통합** - Rate Limiting이 1차 방어선. CAPTCHA는 향후 별도 SPEC에서 검토.
3. **계정 잠금 (Account Lockout)** - Rate Limiting과 별개의 기능. 영구 잠금 + 관리자 해제 흐름 필요.
4. **IP 기반 차단/밴** - Rate Limiting은 시도 횟수 제한이며, 영구 IP 차단은 별도 기능.
5. **비밀번호 재설정 Rate Limiting** - 아직 비밀번호 재설정 기능이 없음 (SPEC 범위 외).
6. **관리자 API Rate Limiting** - 관리자 API는 현재 존재하지 않음.
7. **허니팟 필드 (봇 탐지)** - CSRF 토큰으로 1차 방어. 허니팟은 향후 검토.
8. **비밀번호 유출 데이터베이스 조회 (Have I Been Pwned)** - zxcvbn이 일반적인 약한 패턴을 감지하지만, 외부 API 연동은 별도 SPEC.
9. **이중 인증 (2FA/MFA)** - 향후 보안 강화 SPEC에서 다룰 예정.
10. **비밀번호 변경 UI** - 프로필 관리 SPEC과 함께 구현 예정.

---

## 기술 접근법

### Rate Limiting 아키텍처

```
Client Request
    |
    v
API Route Handler (signup/route.ts or auth.ts authorizeCredentials)
    |-- checkRateLimit(key, config) 호출
    |   |-- In-memory Map에서 카운터 조회
    |   |-- 한계 초과 → 429 반환
    |   |-- 한계 미만 → 카운터 증분 + 진행
    |
    v
Rate Limit State (src/lib/rate-limit.ts)
    |-- Map<string, { count: number, resetAt: number }>
    |-- 1분 간격 만료 엔트리 정리 (setInterval)
    |-- 최대 10,000 엔트리 제한
```

### Rate Limit 키 전략

| 엔드포인트 | 키 형식 | 윈도우 | 최대 횟수 |
|-----------|---------|--------|-----------|
| 로그인 | `login:{ip}:{email}` | 5분 (300초) | 5회 |
| 회원가입 | `signup:{ip}` | 1시간 (3600초) | 3회 |

### 비밀번호 검증 아키텍처

```
Client Input (password string)
    |
    v
password-validator.ts
    |-- validatePasswordLength(password, 12) → boolean
    |-- validatePasswordComplexity(password) → { valid: boolean, missing: string[] }
    |-- evaluatePasswordStrength(password) → { score: 0-4, feedback: string }
    |   |-- @zxcvbn-ts/core로 강도 평가
    |   |-- @zxcvbn-ts/language-common + language-en으로 한국어 환경 지원
    |
    v
Server-side Validation (signup/route.ts)
    |-- 길이 검증 (12자)
    |-- 복잡성 검증 (3/4 종류)
    |-- 강도 평가 (zxcvbn, 참고용 - 차단 기준 아님)
```

### 핵심 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@zxcvbn-ts/core` | ^3.0.0 | 비밀번호 강도 평가 엔진 |
| `@zxcvbn-ts/language-common` | ^3.0.0 | 일반 약한 패턴 사전 |
| `@zxcvbn-ts/language-en` | ^3.0.0 | 영문 기반 패턴 감지 |

### 기존 의존성 (변경 없음)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next-auth` | ^5.0.0-beta.31 | 인증 프레임워크 |
| `bcryptjs` | ^3.0.3 | 비밀번호 해싱 |

---

## 위험 분석

| 위험 | 확률 | 영향 | 완화 전략 |
|------|------|------|-----------|
| PM2 재시작 시 Rate Limit 상태 손실 | 중 | 낮 | 단일 인스턴스 환경, 재시작 직후 보안 영향 최소 |
| 동일 NAT 뒤 여러 사용자 Rate Limit 영향 | 중 | 중 | 로그인은 IP+email 조합으로 구분, 회원가입은 IP만 (의도된 동작) |
| zxcvbn 클라이언트 번들 크기 증가 | 낮 | 낮 | tree-shaking 활용, language 패키지는 경량 |
| 기존 8자 비밀번호 사용자 로그인 불가 | 없음 | 높음 | 소급적용 없음, 신규 비밀번호에만 12자 적용 |
| 이메일 열거 방지로 인한 UX 혼란 | 낮 | 중 | 정상 응답과 동일한 형식, 자동 로그인은 수행하지 않음 |
