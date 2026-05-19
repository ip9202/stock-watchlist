# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-05-19

### Added
- **SPEC-AUTH-001: 이메일/비밀번호 인증 시스템**
  - NextAuth.js v5 Credentials Provider 기반 이메일/비밀번호 인증
  - bcryptjs (cost 12) 비밀번호 해싱
  - Prisma Adapter를 통한 세션 기반 사용자 인증
  - 로그인 페이지 (`/stocks/login`) - 이메일, 비밀번호 입력 필드 및 회원가입 링크
  - 회원가입 페이지 (`/stocks/signup`) - 이메일, 비밀번호, 비밀번호 확인 입력 필드
  - 라우트 보호 미들웨어 - 미인증 사용자 자동 로그인 페이지로 리다이렉트
  - 세션 쿠키 보안 속성 - Secure, HttpOnly, SameSite=Lax
  - CSRF 보호 - NextAuth.js v5 내장 CSRF 토큰 검증
  - 데모 사용자 마이그레이션 스크립트 - `admin@example.com` 계정으로 기존 데이터 이관

- **인증 관련 컴포넌트 및 파일**
  - `src/components/auth/LoginForm.tsx` - 로그인 폼 컴포넌트
  - `src/components/auth/SignupForm.tsx` - 회원가입 폼 컴포넌트
  - `src/components/auth/AuthNav.tsx` - 인증 상태 표시 네비게이션
  - `src/components/auth/SessionProvider.tsx` - 클라이언트 세션 프로바이더
  - `src/lib/auth.ts` - NextAuth.js v5 설정 및 Credentials Provider
  - `src/app/(auth)/layout.tsx` - 인증 페이지 레이아웃
  - `src/middleware.ts` - 라우트 보호 미들웨어
  - `src/types/next-auth.d.ts` - NextAuth 세션 타입 확장

- **테스트**
  - `src/lib/__tests__/auth.test.ts` (6개 테스트) - NextAuth 설정 검증
  - `src/lib/__tests__/auth-packages.test.ts` (5개 테스트) - 패키지 설치 검증
  - `src/lib/__tests__/auth-schema.test.ts` (4개 테스트) - Prisma 스키마 검증
  - `src/app/api/auth/signup/__tests__/route.test.ts` (6개 테스트) - 회원가입 API
  - `src/middleware.test.ts` (2개 테스트) - 라우트 보호 검증
  - `src/components/auth/__tests__/LoginForm.test.tsx` (7개 테스트) - 로그인 폼 UI
  - `src/components/auth/__tests__/SignupForm.test.tsx` (9개 테스트) - 회원가입 폼 UI
  - 총 39개 신규 테스트, 전체 220개 테스트 (기존 204개)

- **데이터베이스 마이그레이션**
  - `prisma/migrations/20260519100531_add_auth_fields/migration.sql`
  - User 모델: `hashedPassword` 필드 추가
  - NextAuth 세션 관리: `Account`, `Session`, `VerificationToken` 모델 추가

- **마이그레이션 유틸리티**
  - `scripts/migrate-demo-user.ts` - 기존 demo@example.com 데이터 → admin@example.com으로 마이그레이션

### Changed
- **Watchlist API 인증 전환**
  - `src/app/api/watchlist/route.ts` - 하드코딩된 `demo@example.com` → 세션 기반 사용자 ID로 변경
  - `src/app/api/watchlist/[id]/route.ts` - 하드코딩된 `demo@example.com` → 세션 기반 사용자 ID로 변경
  - Watchlist 생성/수정/삭제 시 세션에서 사용자 ID 자동 추출
  - 소유자 검증 강화 (403 Forbidden 반환)

- **레이아웃 및 페이지**
  - `src/app/layout.tsx` - SessionProvider로 래핑, 환경 변수 검증 업데이트
  - `src/app/page.tsx` - 인증 상태 기반 렌더링, 사용자 인사말 추가

- **환경변수**
  - `src/lib/env.ts` - `AUTH_SECRET` 필수 환경변수 추가
  - `.env.local` - `AUTH_SECRET`, `AUTH_URL` 추가

- **의존성**
  - `next-auth` ^5.0.0-beta.31 추가
  - `@auth/prisma-adapter` ^2.11.2 추가
  - `bcryptjs` ^3.0.3 추가

- **테스트 환경**
  - `vitest.config.ts` - jsdom 환경 설정 추가 (클라이언트 컴포넌트 테스트 지원)
  - `src/test-setup.ts` - jsdom 테스트 환경 초기화 파일 추가

- **Prisma 스키마**
  - `prisma/schema.prisma` - User 모델 `hashedPassword` 필드 추가
  - NextAuth v5 Prisma Adapter 권장 스키마 적용

### Fixed
- 미인증 사용자가 보호된 페이지 접근 시 자동 로그인 페이지로 리다이렉트
- 세션 만료 시 자동 로그인 페이지로 리다이렉트
- 인증 오류 메시지 개선 (계정 존재 여부 노출 방지)

### Security
- bcryptjs 비밀번호 해싱 (cost factor 12)
- 세션 쿠키 보안 속성 (Secure, HttpOnly, SameSite=Lax)
- CSRF 토큰 검증 (모든 상태 변경 요청)
- 입력값 검증 - 이메일 형식, 비밀번호 길이 (8자 이상)
- 세션 데이터베이스 저장 (Prisma)

### Testing
- 테스트 커버리지: 약 90%
- 신규 테스트 16개 추가 (총 220개)
- 인증 흐름 통합 테스트
- 회원가입 성공/실패 케이스
- 로그인 성공/실패 케이스
- 미들웨어 라우트 보호 검증

## [1.5.0] - 2026-04-17

### Added
- **SPEC-MASHUP-003: AI 시그널 프록시 API + UI 패널**
  - stock_auto 시그널 API 프록시
  - UI 패널 구현

- **SPEC-MASHUP-004: AI 종목 발굴 프록시 API + UI 패널**
  - stock_auto 종목 발굴 API 프록시
  - UI 패널 구현

- **SPEC-MASHUP-005: 관심종목 동기화 클라이언트**
  - stock_auto 동기화 클라이언트
  - watchlist 연동

## [1.4.0] - 2026-04-13

### Added
- **SPEC-POLL-001: 주기적 데이터 폴링 시스템**
  - SWR 기반 폴링
  - 동적 인터벌 관리 (장중/폐장)
  - 시장 상태 감지

### Changed
- 배포 방식 전환: SCP → Git 기반 배포
- 배포 스크립트 개선: `./deploy/deploy.sh` 추가
- start.sh: .next/static 복사 로직 추가
- 서버 git remote 설정: SSH config alias 사용

## [1.3.0] - 2026-03-23

### Added
- **SPEC-MARKET-001: 시장 지표 대시보드**
  - 코스피/코스닥/USD-KRW 환율 시장 지표 표시
  - 탭 선택 UI로 지표 간 전환
  - 미니 차트로 시장 동향 표시

### Changed
- 1일 차트 시간축 최적화 (08:00~16:30, HH:MM 포맷)
- 이전장 종가 참고선 표시 추가

## [1.2.0] - 2026-03-15

### Added
- **SPEC-CHART-002: 차트 UI 개편 및 기능 확장**
  - 봉 타입(일봉/주봉/월봉) + 기간(1일/3개월/1년/3년/10년) 상호 배타적 선택
  - 월봉 차트 API 추가

- **SPEC-CHART-003: 분봉 인트라데이 차트**
  - 1일 인트라데이 분봉 차트 구현
  - 장외시간 지원

### Changed
- 뉴스/공시 API Node.js 전환 (Python 제거)
- 프로덕션 배포 구축 (Docker 제거, Next.js standalone + PM2 + Nginx)

## [1.1.0] - 2026-03-10

### Added
- **SPEC-API-001: 키움증권 REST API 완전 전환**
  - OAuth2 토큰 관리 모듈
  - REST API 클라이언트

- **SPEC-CHART-001: 차트 기능 구현**
  - 일봉/주봉 차트 API
  - lightweight-charts v5 프론트엔드 통합

- **SPEC-API-002: 토큰 만료 처리 강화**
  - Promise 기반 동시 토큰 갱신 중복 제거
  - [8005] 토큰 에러 자동 재시도

## [1.0.0] - 2025-09-04

### Added
- 기본 Next.js 프로젝트 구조
- Prisma ORM + PostgreSQL 연동
- 기본 API 라우트 구현
- UI 컴포넌트 구축
