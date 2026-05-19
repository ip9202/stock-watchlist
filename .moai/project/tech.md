# Stock Watchlist - 기술 스택

## 기술 스택 개요

### 프론트엔드
- **Next.js** 15 - React 풀스택 프레임워크 (App Router, basePath='/stocks')
- **React** 19 - UI 라이브러리
- **TypeScript** 5.x - 타입 안전한 JavaScript
- **Tailwind CSS** v4 - 유틸리티 퍼스트 CSS 프레임워크
- **lightweight-charts** 5.1.0 - TradingView OSS 차트 라이브러리 (동적 import, ssr:false)
- **SWR** 2.3.6 - 데이터 페칭 및 캐싱
- **Lucide React** - 아이콘 라이브러리

### 백엔드
- **Next.js API Routes** - 서버리스 API 엔드포인트
- **TypeScript** - 타입 안전한 API 구현
- **NextAuth.js** v5 - 이메일/비밀번호 인증 (Credentials Provider)
- **bcryptjs** 3.0.3 - 비밀번호 해싱 (cost factor 12)
- **키움증권 REST API** - OAuth2 기반 주식 정보/차트 API
- **Node.js Fetch API** - TypeScript에서 직접 HTTP 호출 (Python 제거됨)
- **사용자 정의 Token Manager** - 싱글톤 패턴, 토큰 자동 갱신, 중복 요청 제거

### 데이터베이스
- **PostgreSQL** 15+ - 관계형 데이터베이스
- **Prisma** 6.15.0+ - TypeScript ORM

### 인증 및 상태 관리
- **NextAuth.js v5** - 세션 기반 사용자 인증
- **Prisma Adapter** - NextAuth 세션 데이터베이스 저장
- **SWR** - API 응답 캐싱 및 동기화
- React Hooks (useState, useEffect) - 로컬 상태 관리

### 개발 도구
- **ESLint** 9 - 코드 린팅
- **TypeScript** - 타입 체크 및 컴파일
- **Turbopack** - Next.js 번들러
- **Vitest** - 단위 테스트 (110 테스트, ~90% 커버리지)

### 배포
- **PM2** - Node.js 프로세스 관리
- **Nginx** - 웹 서버/리버스 프록시
- **PostgreSQL** - 서버 데이터베이스
- 배포 플랫폼: ip9202.site (port 3005, basePath='/stocks')

## 프레임워크 선정 이유

### Next.js 15 + React 19
- **App Router**: 최신 파일 시스템 기반 라우팅
- **Server Components**: 서버 사이드 렌더링으로 향상된 성능
- **API Routes**: 별도의 백엔드 없이 풀스택 개발
- **TypeScript 지원**: 기본적인 타입 안전성 보장
- **Turbopack**: 빠른 빌드와 핫 리로드

### Prisma ORM
- **타입 안전성**: 자동 생성된 TypeScript 타입
- **마이그레이션**: 데이터베이스 스키마 버전 관리
- **PostgreSQL 지원**: 강력한 관계형 데이터베이스
- **직관적인 API**: 읽기 쉬운 쿼리 문법

### Tailwind CSS
- **유틸리티 퍼스트**: 빠른 UI 개발
- **반응형 디자인**: 모바일 퍼스트 접근
- **커스터마이징**: 디자인 시스템 구축 용이
- **v4**: 향상된 성능과 개발자 경험

### 키움증권 REST API
- **공식 데이터**: 실시간 주식 정보 및 차트 데이터
- **OAuth2 인증**: 앱 키 기반 보안 인증
- **동적 응답 처리**: 차트 API 응답 구조 자동 탐색
- **페이지네이션**: cont-yn/next-key 기반 다중 페이지 처리

## 개발 환경 요구사항

### 필수
- **Node.js** 20+ (v25.2.1 권장)
- **PostgreSQL** 15+ (로컬: `brew services start postgresql@18`)
- **Git**

### 권장
- **npm** 또는 **pnpm** (패키지 관리자)
- **VS Code** (IDE)
- Prisma CLI (로컬: `./node_modules/.bin/prisma`)

## 빌드 및 배포 설정

### 개발 스크립트
- `npm run dev` - 개발 서버 (localhost:3000, Turbopack)
- `npm run build` - 프로덕션 빌드 (standalone, prisma generate 포함)
- `npm start` - 프로덕션 서버
- `npm run test` - 테스트 실행 (Vitest)
- `npm run build:prod` - 배포용 빌드 (`prisma generate && next build`)

### 배포 설정
- **배포 방식**: Git 기반 배포 (SCP 방식에서 2026-04-13 전환)
- **배포 대상**: ip9202.site/stocks (port 3005)
- **배포 스크립트**:
  - `./deploy/deploy.sh` — 일반 배포 (git push → 서버 pull → 빌드 → PM2 restart)
  - `./deploy/deploy.sh --db` — DB 마이그레이션 포함
  - `./deploy/setup-server.sh` — 최초 서버 셋업
- **서버 인증**: SSH 키 (GitHub deploy key: id_stock_watchlist)
- **프로세스 관리**: PM2 (ecosystem.config.json, 로그인 셸 사용)
- **웹 서버**: Nginx (3-stage location 설정)
- **데이터베이스**: PostgreSQL 15 (stock_watchlist_prod)
- **롤백**: `git checkout HEAD~1` → 빌드 → PM2 restart

### 환경 변수

**필수 (로컬 및 서버)**:
- `DATABASE_URL` - PostgreSQL 연결 문자열
- `KIWOOM_APP_KEY` - 키움증권 앱 키
- `KIWOOM_SECRET_KEY` - 키움증권 시크릿 키

**선택사항**:
- `NAVER_CLIENT_ID` - 네이버 뉴스 API 클라이언트 ID
- `NAVER_CLIENT_SECRET` - 네이버 뉴스 API 시크릿
- `DART_API_KEY` - DART 공시 API 키
- `STOCK_AUTO_API_URL` - stock_auto 서버 URL (기본: http://14.49.182.30:8080)

**배포 환경**:
- `NODE_ENV=production`
- `PORT=3005`
- `HOSTNAME=0.0.0.0`

## 아키텍처 패턴

### 클라이언트-서버 분리
- **프론트엔드**: React 클라이언트 컴포넌트 (SWR, Hooks)
- **백엔드**: Next.js API Routes (RESTful)
- **데이터베이스**: PostgreSQL + Prisma ORM
- **basePath**: '/stocks' (Nginx 라우팅)

### 데이터 수집 패턴
- **REST API**: 키움증권 REST API 직접 호출 (Node.js fetch)
- **토큰 관리**: Kiwoom Token Manager (싱글톤, 자동 갱신, Promise 중복제거)
- **캐싱**: 종목 리스트 7일, 개별 시세 30초, 차트 캐시 (기간별 1시간~1일)
- **에러 처리**: [8005] 토큰 만료 자동 재시도 1회, 3회 총 재시도

### 차트 패턴
- **API 매핑**: 봉형(일봉/주봉/월봉) + 기간별(1일/3개월/1년/3년/10년)
- **분봉 지원**: 당일 분 단위 가격 변동 (ka10080, tic_scope=1)
- **데이터 처리**: chart-data-utils로 중복 제거, 시간 변환
- **UI 상호 배타성**: 봉 타입 선택 시 캔들/기간 선택 시 라인 (동시 불가)

### 상태 관리 패턴
- **서버 상태**: SWR로 API 데이터 캐싱 및 동기화
- **로컬 상태**: React Hooks (useState, useEffect)
- **사용자 데이터**: PostgreSQL Watchlist (선택적)

## 보안 고려사항

- **API 키**: 환경 변수 관리 (.env.local, 서버 env)
- **OAuth2**: 키움증권 토큰 기반 인증
- **SQL Injection**: Prisma ORM 자동 방어
- **데이터 검증**: env.ts 환경 변수 필수 확인
- **CORS**: Nginx 기본 설정 (필요시 추가)

## 성능 최적화

- **SWR 캐싱**: API 응답 캐싱 및 자동 동기화
- **Lazy Loading**: Chart 컴포넌트 동적 import (ssr:false)
- **데이터 캐싱**: 종목/차트 다층 TTL (7일/30초/1시간/1일)
- **중복 제거**: chart-data-utils로 pagination 중복 제거
- **번들 최적화**: Turbopack, tree-shaking
