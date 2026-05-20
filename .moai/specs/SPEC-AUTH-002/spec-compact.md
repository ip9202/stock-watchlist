# SPEC-AUTH-002 Compact: 인증 시스템 보안 강화

> Auto-generated summary from spec.md, plan.md, acceptance.md

## Summary

SPEC-AUTH-001 인증 시스템에 Rate Limiting, 이메일 열거 방지, 비밀번호 복잡성 강화를 적용한다.

## Requirements (7)

| ID | Type | Description |
|----|------|-------------|
| REQ-AUTH-201 | Event-Driven | 로그인 5분/5회 Rate Limit, 429 응답 |
| REQ-AUTH-202 | Event-Driven | 회원가입 1시간/3회 Rate Limit, 429 응답 |
| REQ-AUTH-203 | State-Driven | Rate Limit 상태 Retry-After 헤더 + JSON 응답 |
| REQ-AUTH-204 | Unwanted | 중복 이메일 회원가입 시 409→200 OK |
| REQ-AUTH-205 | Ubiquitous | 비밀번호 최소 12자 (기존 8자→12자) |
| REQ-AUTH-206 | Event-Driven | 비밀번호 4종류 문자 중 3종류 이상 필수 |
| REQ-AUTH-207 | Optional | zxcvbn 실시간 비밀번호 강도 평가 UI |

## Acceptance Criteria (7)

| ID | Criterion | Verification |
|----|-----------|-------------|
| AC-201 | 5분/5회 로그인 Rate Limit | Unit + Integration |
| AC-202 | 1시간/3회 회원가입 Rate Limit | Unit + Integration |
| AC-203 | Rate Limit 응답에 Retry-After 포함 | Unit |
| AC-204 | 중복 이메일 200 OK (409 아님) | Unit |
| AC-205 | 비밀번호 12자 최소 검증 | Unit |
| AC-206 | 비밀번호 3/4 종류 검증 | Unit |
| AC-207 | zxcvbn 실시간 강도 표시 | Component |

## Files

### New (6)
- `src/lib/rate-limit.ts`
- `src/lib/password-validator.ts`
- `src/lib/__tests__/rate-limit.test.ts`
- `src/lib/__tests__/password-validator.test.ts`
- `src/components/auth/PasswordStrengthIndicator.tsx`
- `src/components/auth/__tests__/PasswordStrengthIndicator.test.tsx`

### Modified (7)
- `src/app/api/auth/signup/route.ts` [DELTA: Rate Limit + 409→200 + 12자 + 복잡성]
- `src/middleware.ts` [DELTA: 로그인 Rate Limit 체크]
- `src/lib/auth.ts` [DELTA: Rate Limit 연동]
- `src/components/auth/SignupForm.tsx` [DELTA: 강도 표시 + 12자]
- `src/components/auth/LoginForm.tsx` [DELTA: 429 처리]
- `src/app/api/auth/signup/__tests__/route.test.ts` [DELTA]
- `src/lib/__tests__/auth.test.ts` [DELTA]

### Dependencies (3)
- `@zxcvbn-ts/core` ^3.0.0
- `@zxcvbn-ts/language-common` ^3.0.0
- `@zxcvbn-ts/language-en` ^3.0.0

## Milestones

| # | Content | Priority | Depends |
|---|---------|----------|---------|
| M1 | Rate Limit 유틸리티 | High | - |
| M2 | Rate Limit 로그인/회원가입 적용 | High | M1 |
| M3 | 비밀번호 검증 모듈 | High | - |
| M4 | zxcvbn 통합 + UI | High | M3 |
| M5 | 이메일 열구 방지 | High | - |
| M6 | 전체 회귀 테스트 | High | M2,M4,M5 |

## Exclusions (10)

1. 분산 Rate Limiting (Redis)
2. CAPTCHA 통합
3. 계정 잠금 (Account Lockout)
4. IP 기반 차단/밴
5. 비밀번호 재설정 Rate Limiting
6. 관리자 API Rate Limiting
7. 허니팟 필드
8. Have I Been Pwned 연동
9. 2FA/MFA
10. 비밀번호 변경 UI

## Edge Cases (5 groups)

- EC-001: Rate Limit 경계값 (4회/5회/만료/동시)
- EC-002: 비밀번호 경계값 (11자/12자/100자/유니코드)
- EC-003: Rate Limit 메모리 (만료 정리/최대 엔트리/재시작)
- EC-004: 이메일 열구 (대소문자/연속/로그)
- EC-005: 기존 사용자 (8자 비밀번호 로그인/강제 변경 없음)

## MX Tags

| Target | Tag | Reason |
|--------|-----|--------|
| authorizeCredentials | @MX:ANCHOR | 기존, fan_in >= 3 |
| checkRateLimit | @MX:WARN | Global Map mutation |
| Rate Limit constants | @MX:NOTE | Security settings |
| Complexity constants | @MX:NOTE | Security settings |
| Email enum prevention | @MX:NOTE | Intentional 200 OK |

## Quality Gates

- Tests: 90%+ on new modules, 220 existing pass
- Types: 0 errors
- Lint: 0 warnings
- Build: success

---

Version: 1.0.0 | Status: planned | Priority: High
