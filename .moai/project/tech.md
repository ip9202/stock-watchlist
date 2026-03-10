# Stock Watchlist - 기술 스택

## 기술 스택 개요

### 프론트엔드
- **Next.js** 15.5.2 - React 풀스택 프레임워크 (App Router)
- **React** 19.1.0 - UI 라이브러리
- **TypeScript** 5.x - 타입 안전한 JavaScript
- **Tailwind CSS** v4 - 유틸리티 퍼스트 CSS 프레임워크
- **lightweight-charts** 5.1.0 - TradingView OSS 차트 라이브러리 (동적 import `ssr: false`)
- **Lucide React** - 아이콘 라이브러리

### 백엔드
- **Next.js API Routes** - 서버리스 API 엔드포인트
- **TypeScript** - 타입 안전한 API 구현
- **키움증권 REST API** - OAuth2 기반 주식 데이터 API
- **Fetch API** - TypeScript에서 직접 HTTP 호출

### 데이터베이스
- **PostgreSQL** 15 - 관계형 데이터베이스
- **Prisma** 6.15.0 - TypeScript ORM

### 상태 관리
- **SWR** 2.3.6 - 데이터 가져오기 및 캐싱
- React Hooks (useState, useEffect) - 로컬 상태

### HTTP 클라이언트
- **Axios** 1.11.0 - HTTP 요청 (Python 스크립트 내)
- Fetch API - 클라이언트 HTTP 요청

### 개발 도구
- **ESLint** 9 - 코드 린팅
- **TypeScript Compiler** - 타입 체크 및 컴파일
- **Turbopack** - Next.js 빌드 도구
- **Vitest** - TypeScript 단위 테스트 (36 테스트, ~90% 커버리지)

### 배포
- **Docker** - 컨테이너화
- **Docker Compose** - 로컬 개발 환경
- **Railway** - 클라우드 배포 플랫폼

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

### Python + PyKRX
- **공식 데이터**: 한국거래소가 제공하는 무료 API
- **안정성**: 공식 지원으로 데이터 신뢰성 보장
- **간편함**: 한국 주식 데이터 쉽게 접근

## 개발 환경 요구사항

### 필수
- **Node.js** 18 이상
- **Python** 3.12 이상
- **Docker** & **Docker Compose**
- **Git**

### 권장
- **pnpm** 또는 **npm** (패키지 관리자)
- **VS Code** (IDE)
- **PostgreSQL** 15 (로컬 개발용)

## 빌드 및 배포 설정

### 개발 스크립트
```json
{
  "dev": "next dev --turbopack",           // 개발 서버
  "build": "prisma generate && prisma migrate deploy && next build --turbopack",
  "start": "next start",                   // 프로덕션 서버
  "db:generate": "prisma generate",        // Prisma 클라이언트 생성
  "db:migrate": "prisma migrate dev",      // 마이그레이션 실행
  "db:studio": "prisma studio"             // Prisma Studio GUI
}
```

### Docker 설정
- **멀티스테이지 빌드**: 의존성 캐싱으로 빠른 빌드
- **Python 포함**: Node.js 이미지에 Python 설치
- **환경 변수**: `.env.local`에서 관리
- **포트**: 3000 (애플리케이션), 5432 (PostgreSQL)

### 환경 변수
```bash
# 데이터베이스
DATABASE_URL=postgresql://user:password@host:port/database
SHADOW_DATABASE_URL=postgresql://user:password@host:port/shadow_db

# 키움증권 REST API (필수)
KIWOOM_APP_KEY=your_kiwoom_app_key
KIWOOM_SECRET_KEY=your_kiwoom_secret_key

# 기타 API 키
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
DART_API_KEY=your_dart_api_key

# Node.js
NODE_ENV=production/development
PORT=3000
```

## Railway 배포 구성

### 서비스
1. **Web Service** (Next.js 애플리케이션)
2. **PostgreSQL** (Railway 관리형 데이터베이스)

### 자동화
- **GitHub 통합**: Push 시 자동 재배포
- **Docker 빌드**: 멀티스테이지 빌드 사용
- **환경 변수**: Railway 대시보드에서 관리
- **Health Check**: `/api/health` 엔드포인트

## 아키텍처 패턴

### 클라이언트-서버 분리
- **프론트엔드**: React Server Components + Client Components
- **백엔드**: Next.js API Routes (RESTful)
- **데이터베이스**: PostgreSQL + Prisma ORM

### 데이터 수집 패턴
- **REST API**: 키움증권 REST API를 통한 직접 호출
- **토큰 관리**: OAuth2 토큰 자동 갱신 및 캐싱
- **캐싱**: 종목 리스트 7일, 개별 시세 30초 TTL
- **에러 처리**: 3회 재시도 + 지수 백오프

### 상태 관리 패턴
- **서버 상태**: SWR으로 API 데이터 캐싱
- **로컬 상태**: React Hooks로 컴포넌트 상태 관리
- **전역 상태**: (계획) Context API 또는 Zustand

## 보안 고려사항

- **API 키**: 환경 변수로 관리, Git에 커밋하지 않음
- **SQL Injection**: Prisma ORM으로 자동 방어
- **CORS**: (계획) 적절한 출처 허용
- **Rate Limiting**: (계획) API 호출 제한

## 성능 최적화

- **SWR 캐싱**: 클라이언트 데이터 캐싱
- **서버 컴포넌트**: 불필요한 JavaScript 번들 감소
- **이미지 최적화**: (계획) Next.js Image 컴포넌트
- **코드 분할**: 동적 import로 초기 로딩 감소
