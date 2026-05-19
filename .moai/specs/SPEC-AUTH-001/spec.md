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

# SPEC-AUTH-001: 이메일/비밀번호 인증 시스템

## HISTORY

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-05-19 | 1.0.0 | 최초 작성 | manager-spec |

---

## 개요

Stock Watchlist 애플리케이션에 이메일/비밀번호 기반 인증 시스템을 도입한다. 현재 하드코딩된 `demo@example.com` 데모 사용자를 실제 세션 기반 인증으로 전환하고, 공개 회원가입을 지원하며, 기존 데모 사용자의 관심종목 데이터를 관리자 계정으로 마이그레이션한다.

**인증 라이브러리**: NextAuth.js v5 (Auth.js) Credentials Provider
**비밀번호 해싱**: bcryptjs 2.4.3
**세션 저장**: Prisma Adapter (PostgreSQL)
**배포 환경**: basePath `/stocks`, HTTPS (ip9202.site)

---

## 요구사항

### 기능 요구사항 (Functional Requirements)

#### REQ-FUNC-001: 회원가입

사용자가 이메일과 비밀번호를 제출하면 시스템은 입력값을 검증한 후 새 계정을 생성한다.

- **When** 사용자가 유효한 이메일과 8자 이상 비밀번호를 회원가입 양식에 제출하면, 시스템은 **shall** bcryptjs로 비밀번호를 해싱한 후 User 레코드를 생성하고 자동 로그인 처리한다.
- **When** 이미 가입된 이메일로 회원가입을 시도하면, 시스템은 **shall** "이미 사용 중인 이메일입니다" 오류 메시지를 표시한다.
- **When** 이메일 형식이 올바르지 않거나 비밀번호가 8자 미만이면, 시스템은 **shall** 제출을 차단하고 필드별 오류 메시지를 표시한다.

#### REQ-FUNC-002: 로그인

사용자가 이메일과 비밀번호로 인증하면 시스템은 세션을 생성한다.

- **When** 사용자가 올바른 이메일과 비밀번호를 로그인 양식에 제출하면, 시스템은 **shall** 세션을 생성하고 메인 대시보드로 리다이렉트한다.
- **When** 잘못된 비밀번호를 제출하면, 시스템은 **shall** "이메일 또는 비밀번호가 올바르지 않습니다" 오류 메시지를 표시한다.
- **When** 존재하지 않는 이메일로 로그인을 시도하면, 시스템은 **shall** 동일한 오류 메시지를 표시한다 (계정 존재 여부 노출 방지).

#### REQ-FUNC-003: 로그아웃

인증된 사용자가 로그아웃하면 시스템은 세션을 종료한다.

- **When** 인증된 사용자가 로그아웃 버튼을 클릭하면, 시스템은 **shall** 세션을 파기하고 로그인 페이지로 리다이렉트한다.

#### REQ-FUNC-004: 세션 유지

인증된 사용자의 세션은 브라우저를 닫았다 다시 열어도 유지된다.

- **While** 사용자가 인증된 상태이면, 시스템은 **shall** 세션을 데이터베이스에 저장하고 브라우저 재시작 후에도 로그인 상태를 유지한다.
- **If** 세션이 만료되면, 시스템은 **shall** 로그인 페이지로 리다이렉트한다.

#### REQ-FUNC-005: API 인증 연동

기존 하드코딩된 데모 사용자 참조를 세션 기반 사용자로 교체한다.

- **When** 인증된 사용자가 관심종목 API에 요청하면, 시스템은 **shall** 세션에서 사용자 ID를 추출하여 해당 사용자의 관심종목 데이터를 반환한다.
- **If** 인증되지 않은 사용자가 보호된 API에 요청하면, 시스템은 **shall** 401 Unauthorized 응답을 반환한다.

---

### 인증 요구사항 (Authorization Requirements)

#### REQ-AUTH-001: 라우트 보호

인증이 필요한 페이지에 대한 접근을 제어한다.

- **If** 인증되지 않은 사용자가 메인 대시보드(`/stocks`)에 접근하면, 시스템은 **shall** 로그인 페이지(`/stocks/login`)로 리다이렉트한다.
- **While** 사용자가 인증된 상태이면, 시스템은 **shall** 로그인 페이지에 접근 시 메인 대시보드로 리다이렉트한다.

#### REQ-AUTH-002: API 라우트 보호

보호된 API 라우트에 대한 접근을 제어한다.

- **While** 사용자가 인증된 상태이면, 시스템은 **shall** 관심종목 API(`/api/watchlist/*`)에 대한 접근을 허용한다.
- **If** 인증되지 않은 요청이 보호된 API에 도달하면, 시스템은 **shall** 401 상태 코드와 함께 요청을 거부한다.

#### REQ-AUTH-003: 소유자 검증

사용자는 자신의 관심종목 데이터에만 접근할 수 있다.

- **When** 사용자가 관심종목 데이터에 접근하면, 시스템은 **shall** 세션 사용자 ID와 요청된 데이터의 소유자 ID가 일치하는지 확인한다.
- **If** 소유자가 불일치하면, 시스템은 **shall** 403 Forbidden 응답을 반환한다.

---

### 보안 요구사항 (Security Requirements)

#### REQ-SEC-001: 비밀번호 해싱

비밀번호는 절대 평문으로 저장되지 않는다.

- 시스템은 **shall** bcryptjs를 사용하여 비밀번호를 해싱한다 (cost factor 12).
- 시스템은 **shall** 평문 비밀번호를 데이터베이스, 로그, 네트워크 응답에 포함하지 않는다.

#### REQ-SEC-002: 세션 보안

세션 쿠키는 안전하게 관리된다.

- **While** 프로덕션 환경(`NODE_ENV=production`)에서 실행 중이면, 시스템은 **shall** 세션 쿠키에 `Secure`, `HttpOnly`, `SameSite=Lax` 속성을 적용한다.
- 시스템은 **shall** `AUTH_SECRET` 환경 변수를 사용하여 세션을 암호화한다.

#### REQ-SEC-003: CSRF 보호

NextAuth.js v5의 내장 CSRF 보호를 활용한다.

- 시스템은 **shall** 모든 상태 변경 요청(로그인, 회원가입, 로그아웃)에 CSRF 토큰 검증을 적용한다.

#### REQ-SEC-004: 입력 검증

모든 인증 관련 입력값은 서버에서 검증된다.

- **When** 이메일 입력값이 제출되면, 시스템은 **shall** RFC 5322 이메일 형식을 검증한다.
- **When** 비밀번호 입력값이 제출되면, 시스템은 **shall** 최소 8자 길이를 검증한다.
- 시스템은 **shall** SQL Injection, XSS 공격 벡터에 대해 입력값을 무해화(sanitize)한다.

#### REQ-SEC-005: 에러 메시지 보안

인증 오류 메시지는 내부 시스템 정보를 노출하지 않는다.

- **If** 인증 실패가 발생하면, 시스템은 **shall** "이메일 또는 비밀번호가 올바르지 않습니다"와 같이 계정 존재 여부를 노출하지 않는 일반적인 메시지를 표시한다.
- 시스템은 **shall** 스택 트레이스, 데이터베이스 오류, 내부 에러 코드를 사용자에게 노출하지 않는다.

#### REQ-SEC-006: basePath 호환성

모든 인증 리다이렉트 URL은 basePath `/stocks`를 올바르게 처리한다.

- **When** 인증 관련 리다이렉트가 발생하면, 시스템은 **shall** 모든 URL에 `/stocks` prefix를 포함한다 (예: `/stocks/login`, `/stocks/api/auth/*`).
- 시스템은 **shall** NextAuth.js 설정에서 `basePath`를 올바르게 구성하여 인증 콜백 URL이 일치하도록 한다.

---

### UI 요구사항 (UI Requirements)

#### REQ-UI-001: 로그인 페이지

로그인 페이지는 이메일과 비밀번호 입력 필드를 제공한다.

- 시스템은 **shall** `/stocks/login` 경로에 로그인 페이지를 제공한다.
- 로그인 페이지는 **shall** 이메일 입력 필드, 비밀번호 입력 필드, 로그인 버튼, 회원가입 링크를 포함한다.
- 로그인 페이지는 **shall** 로딩 중일 때 버튼을 비활성화하고 로딩 상태를 표시한다.

#### REQ-UI-002: 회원가입 페이지

회원가입 페이지는 새 계정 생성 양식을 제공한다.

- 시스템은 **shall** `/stocks/signup` 경로에 회원가입 페이지를 제공한다.
- 회원가입 페이지는 **shall** 이메일, 비밀번호, 비밀번호 확인 입력 필드와 회원가입 버튼, 로그인 링크를 포함한다.
- **When** 비밀번호와 비밀번호 확인이 불일치하면, 시스템은 **shall** 실시간으로 오류 메시지를 표시한다.

#### REQ-UI-003: 네비게이션 인증 상태

네비게이션 바는 인증 상태에 따라 다른 요소를 표시한다.

- **While** 사용자가 인증된 상태이면, 네비게이션은 **shall** 사용자 이메일(또는 이름)과 로그아웃 버튼을 표시한다.
- **While** 사용자가 인증되지 않은 상태이면, 네비게이션은 **shall** 로그인 버튼을 표시한다.

#### REQ-UI-004: 인증 상태 표시

사용자는 현재 로그인된 계정 정보를 확인할 수 있다.

- **While** 사용자가 인증된 상태이면, 시스템은 **shall** 메인 대시보드에 사용자 인사말을 표시한다.

---

### 비기능 요구사항 (Non-Functional Requirements)

#### REQ-NFR-001: 성능

인증 관련 작업은 합리적인 시간 내에 완료되어야 한다.

- 로그인/회원가입 응답 시간은 **shall** P95 기준 2초 이내이다 (bcrypt 해싱 포함).
- 세션 검증은 **shall** 미들웨어에서 50ms 이내에 완료된다.

#### REQ-NFR-002: 호환성

인증 시스템은 기존 배포 환경과 호환되어야 한다.

- 시스템은 **shall** Next.js standalone 빌드 모드와 호환된다.
- 시스템은 **shall** PM2 프로세스 관리자와 호환된다.
- 시스템은 **shall** Nginx 리버스 프록시 환경에서 HTTPS로 정상 동작한다.

#### REQ-NFR-003: 테스트 커버리지

인증 모듈은 높은 테스트 커버리지를 유지해야 한다.

- 인증 관련 코드의 테스트 커버리지는 **shall** 85% 이상이다.
- 테스트는 **shall** 로그인 성공/실패, 회원가입 성공/실패, 세션 만료, 권한 없음 시나리오를 포함한다.

#### REQ-NFR-004: 데이터 마이그레이션

기존 데모 사용자의 데이터를 안전하게 이관한다.

- **When** 인증 시스템이 활성화되면, 시스템은 **shall** 기존 `demo@example.com` 사용자의 관심종목을 `admin@example.com` 관리자 계정으로 마이그레이션한다.
- 마이그레이션 과정은 **shall** 데이터 손실 없이 완료된다.

---

## 인수 기준 요약

| ID | 기준 | 검증 방법 |
|----|------|-----------|
| AC-001 | 이메일/비밀번호로 회원가입 가능 | E2E 테스트 |
| AC-002 | 올바른 자격증명으로 로그인 시 세션 생성 | 단위 + 통합 테스트 |
| AC-003 | 잘못된 자격증명 로그인 시 명확한 오류 메시지 | 단위 테스트 |
| AC-004 | 로그아웃 시 세션 파기 | 단위 테스트 |
| AC-005 | 미인증 시 로그인 페이지로 리다이렉트 | E2E 테스트 |
| AC-006 | 인증된 사용자의 관심종목 정상 동작 | 통합 테스트 |
| AC-007 | basePath `/stocks` 하에서 모든 인증 흐름 정상 | E2E 테스트 |
| AC-008 | 비밀번호 해싱 (bcrypt, cost 12) | 단위 테스트 |
| AC-009 | 세션 쿠키 보안 속성 (Secure, HttpOnly, SameSite) | 단위 테스트 |
| AC-010 | 데모 사용자 데이터 마이그레이션 완료 | 마이그레이션 스크립트 테스트 |

---

## 수정 파일 목록

### 신규 파일

| 파일 경로 | 설명 |
|-----------|------|
| `src/lib/auth.ts` | NextAuth.js v5 설정 및 Credentials Provider |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API 라우트 핸들러 |
| `src/app/api/auth/signup/route.ts` | 회원가입 API 라우트 |
| `src/app/(auth)/login/page.tsx` | 로그인 페이지 |
| `src/app/(auth)/signup/page.tsx` | 회원가입 페이지 |
| `src/app/(auth)/layout.tsx` | 인증 페이지 레이아웃 |
| `src/components/auth/LoginForm.tsx` | 로그인 폼 컴포넌트 |
| `src/components/auth/SignupForm.tsx` | 회원가입 폼 컴포넌트 |
| `src/components/auth/AuthNav.tsx` | 인증 상태 네비게이션 컴포넌트 |
| `src/components/auth/SessionProvider.tsx` | 클라이언트 세션 프로바이더 |
| `src/middleware.ts` | 라우트 보호 미들웨어 |
| `scripts/migrate-demo-user.ts` | 데모 사용자 데이터 마이그레이션 스크립트 |

### 수정 파일

| 파일 경로 | 변경 내용 |
|-----------|-----------|
| `prisma/schema.prisma` | User 모델에 `hashedPassword` 필드 추가, Account/Session 모델 추가 |
| `src/app/layout.tsx` | SessionProvider 래핑, 환경 변수 검증 업데이트 |
| `src/app/page.tsx` | 인증 상태 기반 렌더링, 사용자 인사말 |
| `src/lib/api.ts` | 인증 헤더 포함 (세션 쿠키 자동 전송) |
| `src/lib/env.ts` | `AUTH_SECRET` 필수 환경 변수 추가 |
| `src/app/api/watchlist/route.ts` | `demo@example.com` → 세션 사용자 교체 |
| `src/app/api/watchlist/[id]/route.ts` | `demo@example.com` → 세션 사용자 교체 |
| `src/components/dashboard/WatchlistManager.tsx` | 인증 상태 연동 |
| `package.json` | `next-auth`, `@auth/prisma-adapter`, `bcryptjs` 의존성 추가 |
| `.env.local` | `AUTH_SECRET`, `AUTH_URL` 환경 변수 추가 |

### 테스트 파일

| 파일 경로 | 설명 |
|-----------|------|
| `src/lib/__tests__/auth.test.ts` | NextAuth 설정 단위 테스트 |
| `src/app/api/auth/signup/__tests__/route.test.ts` | 회원가입 API 테스트 |
| `src/app/api/auth/[...nextauth]/__tests__/route.test.ts` | 인증 API 테스트 |
| `src/middleware.test.ts` | 미들웨어 라우트 보호 테스트 |
| `src/components/auth/__tests__/LoginForm.test.tsx` | 로그인 폼 컴포넌트 테스트 |
| `src/components/auth/__tests__/SignupForm.test.tsx` | 회원가입 폼 컴포넌트 테스트 |
| `scripts/__tests__/migrate-demo-user.test.ts` | 마이그레이션 스크립트 테스트 |

---

## 제외 항목 (What NOT to Build)

다음 기능은 본 SPEC의 범위에서 명시적으로 제외한다:

1. **OAuth 소셜 로그인** (Google, GitHub, Kakao 등) - Credentials Provider만 구현
2. **이메일 인증 (Magic Link)** - 비밀번호 기반 인증만 지원
3. **비밀번호 재설정 기능** - 별도 SPEC에서 다룰 예정
4. **2차 인증 (2FA)** - 향후 보안 강제화 시 검토
5. **Remember me 기능** - 세션은 기본적으로 지속성 유지
6. **계정 삭제 기능** - 관리자 기능으로 별도 처리
7. **프로필 관리 UI** - 이름 변경, 아바타 등
8. **역할 기반 접근 제어 (admin/user roles)** - 단일 권한 체계
9. **API 속도 제한 (Rate Limiting)** - 별도 SPEC에서 다룰 예정
10. **비밀번호 변경 기능** - 프로필 관리와 함께 향후 구현

---

## 기술 접근법

### 인증 아키텍처

```
Client Browser
    |
    v
Nginx (HTTPS, /stocks/* -> localhost:3005)
    |
    v
Next.js Middleware (src/middleware.ts)
    |-- /stocks/login, /stocks/signup -> 통과
    |-- /stocks/api/auth/* -> 통과
    |-- /stocks/* -> 세션 검증 -> 미인증 시 /stocks/login 리다이렉트
    |
    v
NextAuth.js v5 (src/lib/auth.ts)
    |-- Credentials Provider (email/password)
    |-- Prisma Adapter (PostgreSQL 세션 저장)
    |-- bcryptjs (비밀번호 검증)
    |
    v
API Routes (src/app/api/*)
    |-- 세션에서 사용자 ID 추출
    |-- 소유자 검증
```

### 핵심 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next-auth` | ^5.0.0 | 인증 프레임워크 (Auth.js v5) |
| `@auth/prisma-adapter` | latest | Prisma 세션 어댑터 |
| `bcryptjs` | ^2.4.3 | 비밀번호 해싱 |
| `@types/bcryptjs` | latest | TypeScript 타입 |

### Prisma 스키마 변경

User 모델에 `hashedPassword` 필드를 추가하고, NextAuth 세션 관리를 위한 Account, Session 모델을 추가한다. (NextAuth v5 Prisma Adapter 권장 스키마 기준)
