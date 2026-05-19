---
id: SPEC-AUTH-001
version: 1.0.0
status: draft
generated_from: spec.md v1.0.0
generated_at: 2026-05-19
---

# SPEC-AUTH-001: Compact Reference

## REQ 요구사항 전체 목록

### 기능 요구사항

| ID | 요구사항 | EARS 유형 |
|----|----------|-----------|
| REQ-FUNC-001 | 이메일/비밀번호 회원가입 (bcrypt 해싱, 자동 로그인, 중복 이메일 방지, 입력 검증) | Event-Driven |
| REQ-FUNC-002 | 이메일/비밀번호 로그인 (세션 생성, 오류 메시지, 계정 노출 방지) | Event-Driven |
| REQ-FUNC-003 | 로그아웃 (세션 파기, 로그인 페이지 리다이렉트) | Event-Driven |
| REQ-FUNC-004 | 세션 유지 (DB 세션 저장, 브라우저 재시작 후 유지, 만료 시 리다이렉트) | State-Driven |
| REQ-FUNC-005 | API 인증 연동 (세션 사용자 ID, 미인증 시 401) | Event-Driven |

### 인증 요구사항

| ID | 요구사항 | EARS 유형 |
|----|----------|-----------|
| REQ-AUTH-001 | 라우트 보호 (미인증 -> /stocks/login, 인증된 로그인 페이지 -> 대시보드) | State-Driven |
| REQ-AUTH-002 | API 라우트 보호 (인증 시 허용, 미인증 시 401) | State-Driven |
| REQ-AUTH-003 | 소유자 검증 (세션 ID == 데이터 소유자 ID, 불일치 시 403) | Event-Driven |

### 보안 요구사항

| ID | 요구사항 | EARS 유형 |
|----|----------|-----------|
| REQ-SEC-001 | 비밀번호 해싱 (bcryptjs, cost=12, 평문 저장 금지) | Ubiquitous |
| REQ-SEC-002 | 세션 보안 (Secure, HttpOnly, SameSite=Lax, AUTH_SECRET 암호화) | State-Driven |
| REQ-SEC-003 | CSRF 보호 (NextAuth 내장 CSRF 토큰 검증) | Ubiquitous |
| REQ-SEC-004 | 입력 검증 (RFC 5322 이메일, 8자 비밀번호, SQLi/XSS 무해화) | Event-Driven |
| REQ-SEC-005 | 에러 메시지 보안 (계정 노출 방지, 스택 트레이스 숨김) | Unwanted |
| REQ-SEC-006 | basePath 호환성 (/stocks prefix, NextAuth basePath 설정) | Ubiquitous |

### UI 요구사항

| ID | 요구사항 | EARS 유형 |
|----|----------|-----------|
| REQ-UI-001 | 로그인 페이지 (/stocks/login, 이메일/비밀번호/버튼/회원가입 링크) | Ubiquitous |
| REQ-UI-002 | 회원가입 페이지 (/stocks/signup, 이메일/비밀번호/확인/버튼/로그인 링크) | Ubiquitous |
| REQ-UI-003 | 네비게이션 인증 상태 (인증: 이메일+로그아웃, 미인증: 로그인 버튼) | State-Driven |
| REQ-UI-004 | 인증 상태 표시 (메인 대시보드 사용자 인사말) | State-Driven |

### 비기능 요구사항

| ID | 요구사항 | EARS 유형 |
|----|----------|-----------|
| REQ-NFR-001 | 성능 (로그인/가입 P95 < 2s, 세션 검증 < 50ms) | Ubiquitous |
| REQ-NFR-002 | 호환성 (standalone, PM2, Nginx HTTPS) | Ubiquitous |
| REQ-NFR-003 | 테스트 커버리지 (85%+, 성공/실패/만료/권한 시나리오) | Ubiquitous |
| REQ-NFR-004 | 데이터 마이그레이션 (demo -> admin, 무손실) | Event-Driven |

---

## 인수 기준 전체 목록

| ID | 기준 | 검증 방법 | 관련 REQ |
|----|------|-----------|----------|
| AC-001 | 이메일/비밀번호로 회원가입 가능 | E2E 테스트 | REQ-FUNC-001 |
| AC-002 | 올바른 자격증명으로 로그인 시 세션 생성 | 단위 + 통합 테스트 | REQ-FUNC-002 |
| AC-003 | 잘못된 자격증명 로그인 시 명확한 오류 메시지 | 단위 테스트 | REQ-FUNC-002, REQ-SEC-005 |
| AC-004 | 로그아웃 시 세션 파기 | 단위 테스트 | REQ-FUNC-003 |
| AC-005 | 미인증 시 로그인 페이지로 리다이렉트 | E2E 테스트 | REQ-AUTH-001 |
| AC-006 | 인증된 사용자의 관심종목 정상 동작 | 통합 테스트 | REQ-FUNC-005, REQ-AUTH-003 |
| AC-007 | basePath `/stocks` 하에서 모든 인증 흐름 정상 | E2E 테스트 | REQ-SEC-006 |
| AC-008 | 비밀번호 해싱 (bcrypt, cost 12) | 단위 테스트 | REQ-SEC-001 |
| AC-009 | 세션 쿠키 보안 속성 (Secure, HttpOnly, SameSite) | 단위 테스트 | REQ-SEC-002 |
| AC-010 | 데모 사용자 데이터 마이그레이션 완료 | 마이그레이션 스크립트 테스트 | REQ-NFR-004 |

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
| `prisma/schema.prisma` | User 모델 `hashedPassword` 추가, Account/Session 모델 추가 |
| `src/app/layout.tsx` | SessionProvider 래핑, 환경 변수 검증 업데이트 |
| `src/app/page.tsx` | 인증 상태 기반 렌더링, 사용자 인사말 |
| `src/lib/api.ts` | 인증 헤더 포함 |
| `src/lib/env.ts` | `AUTH_SECRET` 필수 환경 변수 추가 |
| `src/app/api/watchlist/route.ts` | `demo@example.com` -> 세션 사용자 교체 |
| `src/app/api/watchlist/[id]/route.ts` | `demo@example.com` -> 세션 사용자 교체 |
| `src/components/dashboard/WatchlistManager.tsx` | 인증 상태 연동 |
| `package.json` | `next-auth`, `@auth/prisma-adapter`, `bcryptjs` 추가 |
| `.env.local` | `AUTH_SECRET`, `AUTH_URL` 추가 |

### 테스트 파일

| 파일 경로 | 설명 |
|-----------|------|
| `src/lib/__tests__/auth.test.ts` | NextAuth 설정 단위 테스트 |
| `src/app/api/auth/signup/__tests__/route.test.ts` | 회원가입 API 테스트 |
| `src/app/api/auth/[...nextauth]/__tests__/route.test.ts` | 인증 API 테스트 |
| `src/middleware.test.ts` | 미들웨어 라우트 보호 테스트 |
| `src/components/auth/__tests__/LoginForm.test.tsx` | 로그인 폼 테스트 |
| `src/components/auth/__tests__/SignupForm.test.tsx` | 회원가입 폼 테스트 |
| `scripts/__tests__/migrate-demo-user.test.ts` | 마이그레이션 스크립트 테스트 |

---

## 제외 항목

1. OAuth 소셜 로그인 (Google, GitHub, Kakao 등)
2. 이메일 인증 (Magic Link)
3. 비밀번호 재설정 기능
4. 2차 인증 (2FA)
5. Remember me 기능
6. 계정 삭제 기능
7. 프로필 관리 UI
8. 역할 기반 접근 제어 (admin/user roles)
9. API 속도 제한 (Rate Limiting)
10. 비밀번호 변경 기능
