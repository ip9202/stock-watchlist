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

# SPEC-AUTH-001: 구현 계획

## 구현 개요

이메일/비밀번호 인증 시스템을 4단계로 구현한다. 각 단계는 독립적으로 검증 가능하며, 이전 단계의 산출물에 의존한다.

---

## Phase 1: 인프라 구축 (Infrastructure)

**목표**: NextAuth.js v5 설정, Prisma 스키마 변경, 환경 변수 구성

### 마일스톤

| 순서 | 작업 | 우선순위 | 산출물 |
|------|------|----------|--------|
| 1-1 | 패키지 설치 (`next-auth`, `@auth/prisma-adapter`, `bcryptjs`, `@types/bcryptjs`) | High | `package.json` 업데이트 |
| 1-2 | Prisma 스키마 변경 (`hashedPassword` 필드, Account/Session 모델 추가) | High | `prisma/schema.prisma` |
| 1-3 | Prisma 마이그레이션 실행 | High | 마이그레이션 SQL |
| 1-4 | 환경 변수 업데이트 (`AUTH_SECRET`, `AUTH_URL`) | High | `.env.local`, `src/lib/env.ts` |
| 1-5 | NextAuth 설정 파일 생성 (`src/lib/auth.ts`) | High | Credentials Provider 구성 |
| 1-6 | NextAuth API 라우트 생성 (`src/app/api/auth/[...nextauth]/route.ts`) | High | 인증 엔드포인트 |
| 1-7 | NextAuth 설정 단위 테스트 | High | `src/lib/__tests__/auth.test.ts` |

### Prisma 스키마 변경 상세

```prisma
model User {
  id             String    @id @default(cuid())
  email          String    @unique
  name           String?
  hashedPassword String?   // null 허용 (OAuth용, 향후 확장)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  watchlists Watchlist[]
  accounts   Account[]
  sessions   Session[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

### 환경 변수 변경

```typescript
// src/lib/env.ts 변경 사항
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'KIWOOM_APP_KEY',
  'KIWOOM_SECRET_KEY',
  'AUTH_SECRET',      // 추가: NextAuth 세션 암호화 키
] as const
```

### 의존성 버전

| 패키지 | 버전 | 비고 |
|--------|------|------|
| `next-auth` | ^5.0.0 | Auth.js v5 (beta/stable) |
| `@auth/prisma-adapter` | ^2.0.0 | NextAuth v5 호환 |
| `bcryptjs` | ^2.4.3 | 검증된 비밀번호 해싱 라이브러리 |
| `@types/bcryptjs` | ^2.4.3 | TypeScript 타입 정의 |

---

## Phase 2: API 및 미들웨어 마이그레이션 (API Migration)

**목표**: 기존 하드코딩된 데모 사용자를 세션 기반 사용자로 교체, API 보호 적용

### 마일스톤

| 순서 | 작업 | 우선순위 | 산출물 |
|------|------|----------|--------|
| 2-1 | 미들웨어 생성 (`src/middleware.ts`) | High | 라우트 보호 로직 |
| 2-2 | Watchlist API 세션 연동 (`src/app/api/watchlist/route.ts`) | High | `demo@example.com` 제거 |
| 2-3 | Watchlist 개별 API 세션 연동 (`src/app/api/watchlist/[id]/route.ts`) | High | `demo@example.com` 제거 |
| 2-4 | 회원가입 API 생성 (`src/app/api/auth/signup/route.ts`) | High | 이메일/비밀번호 등록 |
| 2-5 | 미들웨어 테스트 | High | `src/middleware.test.ts` |
| 2-6 | Watchlist API 테스트 업데이트 | Medium | 세션 모킹 기반 테스트 |
| 2-7 | 회원가입 API 테스트 | High | `src/app/api/auth/signup/__tests__/route.test.ts` |

### 미들웨어 라우트 매칭 규칙

```
공개 라우트 (인증 불필요):
  - /stocks/login
  - /stocks/signup
  - /stocks/api/auth/*
  - /stocks/api/stocks/*      (공개 주식 데이터)
  - /stocks/api/market/*      (공개 시장 데이터)
  - /stocks/api/disclosures/* (공개 공시 데이터)
  - /stocks/api/signals/*     (공개 시그널)
  - /stocks/api/health        (헬스체크)

보호 라우트 (인증 필요):
  - /stocks/                  (메인 대시보드)
  - /stocks/api/watchlist/*   (관심종목 API)
  - /stocks/discovery         (종목 발굴)
```

### Watchlist API 변경 패턴

**Before** (하드코딩):
```typescript
const demoUser = await prisma.user.findUnique({
  where: { email: 'demo@example.com' }
})
```

**After** (세션 기반):
```typescript
const session = await auth()
if (!session?.user?.id) {
  return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
}
const user = await prisma.user.findUnique({
  where: { id: session.user.id }
})
```

---

## Phase 3: UI 통합 (UI Integration)

**목표**: 로그인/회원가입 페이지, 세션 프로바이더, 네비게이션 인증 상태

### 마일스톤

| 순서 | 작업 | 우선순위 | 산출물 |
|------|------|----------|--------|
| 3-1 | SessionProvider 컴포넌트 (`src/components/auth/SessionProvider.tsx`) | High | 클라이언트 세션 컨텍스트 |
| 3-2 | Root Layout 업데이트 (`src/app/layout.tsx`) | High | SessionProvider 래핑 |
| 3-3 | 인증 페이지 레이아웃 (`src/app/(auth)/layout.tsx`) | Medium | 중앙 정렬 카드 레이아웃 |
| 3-4 | 로그인 페이지 (`src/app/(auth)/login/page.tsx`) | High | 로그인 UI |
| 3-5 | 회원가입 페이지 (`src/app/(auth)/signup/page.tsx`) | High | 회원가입 UI |
| 3-6 | 로그인 폼 컴포넌트 (`src/components/auth/LoginForm.tsx`) | High | 이메일/비밀번호 폼 |
| 3-7 | 회원가입 폼 컴포넌트 (`src/components/auth/SignupForm.tsx`) | High | 등록 폼 |
| 3-8 | 인증 네비게이션 (`src/components/auth/AuthNav.tsx`) | Medium | 로그인/로그아웃 버튼 |
| 3-9 | 메인 페이지 업데이트 (`src/app/page.tsx`) | Medium | 사용자 인사말 |
| 3-10 | LoginForm 컴포넌트 테스트 | High | `src/components/auth/__tests__/LoginForm.test.tsx` |
| 3-11 | SignupForm 컴포넌트 테스트 | High | `src/components/auth/__tests__/SignupForm.test.tsx` |

### UI 컴포넌트 구조

```
src/app/layout.tsx
  |-- SessionProvider (client component)
  |     |-- AuthNav (로그인/로그아웃 상태)
  |     |-- {children}

src/app/(auth)/layout.tsx
  |-- 중앙 정렬 카드 컨테이너
  |     |-- {children}

src/app/(auth)/login/page.tsx
  |-- LoginForm
  |     |-- 이메일 입력 (type=email, required)
  |     |-- 비밀번호 입력 (type=password, required)
  |     |-- 로그인 버튼 (loading 상태 지원)
  |     |-- 회원가입 링크

src/app/(auth)/signup/page.tsx
  |-- SignupForm
  |     |-- 이메일 입력 (type=email, required)
  |     |-- 비밀번호 입력 (type=password, minlength=8)
  |     |-- 비밀번호 확인 입력 (type=password)
  |     |-- 회원가입 버튼 (loading 상태 지원)
  |     |-- 로그인 링크
```

### Tailwind CSS 디자인 가이드

- 카드 컨테이너: `max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md`
- 입력 필드: `w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500`
- 버튼: `w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50`
- 오류 메시지: `text-red-600 text-sm mt-1`
- 링크: `text-blue-600 hover:text-blue-800`

---

## Phase 4: 데이터 마이그레이션 및 검증 (Data Migration)

**목표**: 데모 사용자 데이터 이관, 전체 통합 테스트

### 마일스톤

| 순서 | 작업 | 우선순위 | 산출물 |
|------|------|----------|--------|
| 4-1 | 데모 사용자 마이그레이션 스크립트 (`scripts/migrate-demo-user.ts`) | High | admin@example.com 계정 생성 |
| 4-2 | 마이그레이션 스크립트 테스트 | High | `scripts/__tests__/migrate-demo-user.test.ts` |
| 4-3 | 전체 인증 흐름 통합 테스트 | High | 종단 간 시나리오 |
| 4-4 | 프로덕션 배포 설정 업데이트 | Medium | `.env` 서버 환경 변수 |
| 4-5 | 기존 테스트 스위트 회귀 테스트 | High | 전체 테스트 통과 확인 |

### 마이그레이션 스크립트 로직

```
1. demo@example.com 사용자 조회
2. admin@example.com 사용자 생성 (비밀번호: 환경 변수에서 읽기)
3. demo@example.com의 모든 Watchlist 레코드를 admin@example.com으로 이관
4. demo@example.com 사용자 삭제 (Cascade로 Watchlist 자동 삭제)
5. 결과 로그 출력
```

---

## 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.5.2 | App Router, API Routes, Middleware |
| React | 19.1.0 | UI 컴포넌트 |
| TypeScript | 5.x | 타입 안전성 |
| NextAuth.js | ^5.0.0 | 인증 프레임워크 |
| @auth/prisma-adapter | ^2.0.0 | 세션 데이터베이스 저장 |
| bcryptjs | ^2.4.3 | 비밀번호 해싱 (cost=12) |
| Prisma | ^6.15.0 | ORM, 마이그레이션 |
| PostgreSQL | 15+ | 사용자/세션 데이터 |
| Tailwind CSS | v4 | UI 스타일링 |
| Vitest | ^3.2.4 | 단위/통합 테스트 |

---

## 리스크 분석 및 완화 전략

| 리스크 | 영향 | 가능성 | 완화 전략 |
|--------|------|--------|-----------|
| basePath `/stocks`와 NextAuth 콜백 URL 불일치 | High | Medium | Phase 1에서 즉시 검증, `AUTH_URL` 환경 변수로 제어 |
| bcrypt 해싱 성능 (cost=12, 서버 리소스) | Medium | Low | cost factor 조정 가능 (10-12 범위), 로그인 시에만 해싱 |
| 기존 Watchlist API 테스트 회귀 | High | Medium | Phase 2에서 세션 모킹 패턴 확립 후 기존 테스트 업데이트 |
| Prisma 마이그레이션 실패 (기존 데이터) | High | Low | 마이그레이션 전 백업, `SHADOW_DATABASE_URL` 활용 |
| 세션 만료 후 사용자 경험 저하 | Medium | Medium | 세션 만료 시 자동 로그인 페이지 리다이렉트, 이전 페이지 복귀 |
| NextAuth v5 API 안정성 (아직 베타 가능) | Medium | Low | Context7 최신 문서 확인, 안정 릴리스 사용 |
| 프로덕션 HTTPS 필수 (Secure 쿠키) | High | Low | Nginx에서 이미 HTTPS 적용 중, `AUTH_URL=https://ip9202.site/stocks` 설정 |

### 핵심 검증 체크포인트

1. **Phase 1 완료 후**: `npm run build` 성공, Prisma 마이그레이션 적용, NextAuth 엔드포인트 응답
2. **Phase 2 완료 후**: 미인증 시 401 응답, 세션 기반 Watchlist CRUD 동작
3. **Phase 3 완료 후**: 로그인/회원가입 UI 동작, 세션 유지, 로그아웃 동작
4. **Phase 4 완료 후**: 전체 테스트 스위트 통과, 마이그레이션 스크립트 정상 동작

---

## 개발 방법론

본 SPEC은 **TDD (Test-Driven Development)** 모드로 구현한다.

- `quality.yaml`의 `development_mode: tdd` 설정에 따름
- RED-GREEN-REFACTOR 사이클 적용
- 최소 80% 커버리지 per commit
- 85%+ 최종 커버리지 타겟
