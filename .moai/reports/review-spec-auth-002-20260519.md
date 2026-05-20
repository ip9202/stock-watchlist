# Code Review Report - feature/SPEC-AUTH-002-auth-security

**Date**: 2026-05-19
**Branch**: feature/SPEC-AUTH-002-auth-security
**Base Branch**: develop
**Files Changed**: 21
**Lines Added**: ~2000

---

## Executive Summary

이 SPEC은 중요한 보안 기능(rate limiting, 비밀번호 검증, 이메일 열거 방지)을 구현하지만, **프로덕션 배포 전 치명적 보안 취약점을 해결해야 합니다**. 메모리 내 rate limiter에 우회 가능한 경쟁 조건이 있고, IP 추적이 스푸핑 가능하며, 타이밍 공격이 여전히 가능합니다. 코드 품질과 테스트 커버리지는 우수하지만, 보안 강화가 필요합니다.

---

## Critical Issues (must fix) 🔴

### [SECURITY] src/lib/rate-limit.ts:48 - Race Condition in Global Map Mutation

**Problem**: The `rateLimitMap` is a global mutable Map accessed without synchronization. In Node.js async/concurrent environments, multiple simultaneous requests can create race conditions.

**Impact**: Rate limit can be bypassed by sending simultaneous requests. Attacker can exceed limits by exploiting TOCTOU (time-of-check-time-of-use) window.

**Fix Required**: Use atomic operations or mutex locks. For production, migrate to Redis-based distributed rate limiting.

**Evidence**: Lines 116-131 show non-atomic read-modify-write pattern.

---

### [SECURITY] src/middleware.ts:26-36 - IP Spoofing Vulnerability

**Problem**: Rate limit key uses `x-forwarded-for` header which can be spoofed by attackers.

**Impact**: Attacker can bypass rate limits by rotating IP addresses in the header.

**Fix Required**: Use trusted proxy IP from connection info, not client-controlled headers.

**OWASP**: A01:2021 – Broken Access Control

---

### [SECURITY] src/app/api/auth/signup/route.ts:102-113 - Email Enumeration via Timing Attack

**Problem**: Database query `findUnique` completes before bcrypt hash calculation. Timing difference reveals email existence.

**Impact**: Attacker can measure response times to enumerate registered emails.

**Fix Required**: Add constant-time delay or perform dummy bcrypt operation for all requests.

**OWASP**: A01:2021 – Broken Access Control (Account Enumeration)

---

### [PERFORMANCE] src/lib/rate-limit.ts:55-86 - Inefficient Lazy Cleanup

**Problem**: Cleanup iterates entire Map entries on every rate limit check when size exceeds MAX_ENTRIES. O(N) scan on hot path.

**Impact**: Performance degrades as Map grows. With 10,000 entries, every request triggers full scan.

**Fix Required**: Use LRU cache with TTL (e.g., `lru-cache` package) or scheduled cleanup via setInterval.

---

### [SECURITY] src/middleware.ts:28-36 - Request Body Consumption Breaks Stream

**Problem**: `req.clone()` is called but JSON parsing can fail or timeout. The cloned request body is consumed, making original request unusable.

**Impact**: Authentication fails silently if body parsing fails, creating denial-of-service.

**Fix Required**: Wrap in try-catch with explicit error handling.

**OWASP**: A05:2021 – Security Misconfiguration

---

## Warnings (should fix) ⚠️

### [QUALITY] src/lib/rate-limit.ts:65 - Magic Number in Cleanup Logic

**Problem**: `const windowMs = entry.windowStart + (300 * 1000)` hardcodes 300 seconds.

**Fix**: Use `Math.max(LOGIN_WINDOW, SIGNUP_WINDOW) * 1000`.

---

### [UX] src/components/auth/SignupForm.tsx:92-94 - Confusing Success Message on Duplicate Email

**Problem**: User sees "회원가입이 완료되었습니다" even when email already exists.

**Fix**: Consider password reset link or clearer messaging (beware of enumeration).

---

### [SECURITY] src/app/api/auth/signup/route.ts:21 - Weak Email Validation Regex

**Problem**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` allows many invalid formats.

**Fix**: Use proper RFC 5322 validation or `validator.js` with `isEmail()`.

---

### [PERFORMANCE] src/lib/password-validator.ts:106 - Synchronous zxcvbn on Main Thread

**Problem**: `zxcvbn(password)` is CPU-intensive for long passwords (100+ chars).

**Fix**: Move to worker thread or set max password length (64 chars).

---

### [QUALITY] package.json:32 - Axios Vulnerabilities (HIGH severity)

**Problem**: `axios@1.11.0` has multiple HIGH severity vulnerabilities.

**Fix**: Run `npm audit fix` to upgrade to latest secure version.

---

## Suggestions (nice to have) 💡

### [QUALITY] src/lib/rate-limit.ts:153-155 - Test-only Utility in Production Code

**Problem**: `_resetRateLimitMap()` export pollutes production API.

**Fix**: Move to test-only export or conditional export.

---

### [PERFORMANCE] src/middleware.ts:24 - String Concatenation in Hot Path

**Problem**: `` `${ip}:${email}` `` creates new string on every check.

**Fix**: Use pre-computed hash for better cache locality.

---

### [SECURITY] src/lib/password-validator.ts:57 - Special Character Set Limited

**Problem**: Regex excludes some valid special chars (e.g., `~`, `` ` ``).

**Fix**: Use Unicode property escape `\p{S}` or expand character class.

---

### [UX] src/components/auth/PasswordStrengthIndicator.tsx:80 - Accessibility Missing

**Problem**: Strength indicator lacks `aria-live` region.

**Fix**: Add `<div aria-live="polite" className="sr-only">{announcement}</div>`.

---

## MX Tag Compliance

**Missing Tags**: 0
**Outdated Tags**: 0
**Compliant Files**: 10/10 (100%)

Excellent MX Tag Coverage:
- `@MX:ANCHOR` properly identifies high fan-in functions
- `@MX:WARN` flags global state mutation
- `@MX:NOTE` documents security-critical behaviors
- `@MX:REASON` provides justification for WARN/ANCHOR tags

---

## Overall Assessment

### Security: FAIL ❌
- **Critical**: Race condition in rate limiter (bypassable)
- **Critical**: IP spoofing vulnerability
- **Critical**: Timing attack vector in email enumeration
- **High**: Axios vulnerabilities in dependencies
- **Medium**: Request body consumption DoS

### Performance: WARN ⚠️
- **Warning**: O(N) lazy cleanup on hot path
- **Warning**: Synchronous zxcvbn blocks event loop
- **Acceptable**: 1000 requests in <100ms (under load risks exist)

### Quality: PASS ✅
- **Excellent**: 24 test files, 220+ tests comprehensive coverage
- **Excellent**: ESLint passes with only unused variable warnings (fixed)
- **Excellent**: TypeScript compilation clean
- **Good**: MX tag coverage 100%

### UX: WARN ⚠️
- **Warning**: Confusing success message on duplicate email
- **Warning**: Password strength indicator lacks `aria-live` announcements
- **Good**: Real-time password feedback with visual strength meter
- **Good**: 429 error handling with retry-after display

### TRUST 5 Score: 3/5
- ✅ **Tested**: Comprehensive test coverage (220+ tests)
- ✅ **Readable**: Clear naming, Korean comments, good structure
- ✅ **Unified**: Consistent code style, follows project patterns
- ❌ **Secured**: **FAIL** - Race conditions, IP spoofing, timing attacks
- ✅ **Trackable**: Git history clear, SPEC references included

---

## Recommended Actions Before Merge

1. **CRITICAL**: Fix race condition in rate-limit.ts (use mutex or Redis)
2. **CRITICAL**: Validate IP extraction in middleware.ts (prevent spoofing)
3. **CRITICAL**: Add constant-time delay to prevent email enumeration timing attack
4. **HIGH**: Run `npm audit fix` to update axios and vulnerable dependencies
5. **MEDIUM**: Replace lazy cleanup with LRU cache or scheduled cleanup
6. **MEDIUM**: Improve email validation regex or use validator library
7. **LOW**: Add max password length (64 chars) to prevent DoS via long passwords
8. **LOW**: Move `_resetRateLimitMap` to test-only export

---

## Security Testing Recommendations

1. **Race Condition Test**: Send 100 simultaneous requests to `/api/auth/signup` from same IP
2. **IP Spoofing Test**: Rotate `x-forwarded-for` header values
3. **Timing Attack Test**: Measure response times for existing vs non-existing emails
4. **Load Test**: 1000 concurrent auth requests
5. **Dependency Scan**: Run `npm audit --production`

---

## Auto-Fix Applied (Level 1)

### Files Modified:
- `src/app/api/auth/signup/route.ts`

### Changes:
- Removed unused import: `REQUIRED_CHAR_TYPES`
- Added `eslint-disable-next-line` for intentionally unused `_hp` variables

---

**Report Generated**: 2026-05-19
**Workflow**: /moai review → /moai fix
**Agent**: manager-quality (multi-perspective analysis)
