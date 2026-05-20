# 프로젝트 개선 종합 보고서 및 계획

**작성일**: 2026-02-28
**팀**: moai-project-improvement
**분석 범위**: 코드 품질, 문서, DevOps, 보안

---

## 1. Executive Summary

Stock Watchlist 프로젝트에 대한 종합 분석 결과, **전반적인 점수: 6.5/10**입니다.

**주요 성과**:
- ✅ 깔끔한 아키텍처 (Next.js 15, Prisma, Docker)
- ✅ TypeScript 전면 사용
- ✅ 문서화 잘 되어 있음

**주요 문제점**:
- 🔴 **Critical 5개**: 보안 심각, 테스트 없음, CI/CD 없음
- 🟠 **High 8개**: 로깅, 환경변수, 코드 중복
- 🟡 **Medium 7개**: 모니터링, 캐싱, 문서

---

## 2. Critical Issues (즉시 조치 필요)

| # | 문제 | 영향 | 추천 조치 |
|---|------|------|-----------|
| 1 | `.env.example`에 실제 API 키 노출 | 보안 심각 | API 키 재발급, placeholder로 대체 |
| 2 | 인증 미구현 (demo@example.com) | 보안 심각 | NextAuth.js 또는 Clerk 도입 |
| 3 | 테스트 커버리지 0% | 품질 심각 | Vitest + React Testing Library 도입 |
| 4 | `scripts/keys/` 시크릿 파일 | 보안 심각 | Git 확인 후 제거 |
| 5 | CI/CD 파이프라인 없음 | 배포 심각 | GitHub Actions 구축 |

---

## 3. High Priority Issues (이번 스프린트)

| # | 문제 | 영향 | 추천 조치 |
|---|------|------|-----------|
| 1 | console.log 10+개 (프로덕션) | 정보 누출 | Pino/Winston 로깅 도입 |
| 2 | 환경변수 검증 없음 | 시작 실패 | 시작 시 검증 로직 추가 |
| 3 | 인증 패턴 코드 중복 (5번) | 유지보수 | 미들웨어로 추출 |
| 4 | 사용자 에러 피드백 없음 | UX | Toast/Alert 컴포넌트 도입 |
| 5 | Docker root 사용자 실행 | 보안 | 비root 사용자 추가 |
| 6 | 구조화된 로깅 없음 | 운영 | JSON 로그 포맷 도입 |
| 7 | MX 태그 미사용 | AI 컨텍스트 | @MX 태그 스캔 실행 |
| 8 | 헬스체크 기본적 | 모니터링 | DB/Python 상태 확인 추가 |

---

## 4. Medium Priority Issues (다음 스프린트)

| # | 문제 | 영향 | 추진 방향 |
|---|------|------|-----------|
| 1 | API 문서 없음 (OpenAPI) | 개발자 경험 | Swagger UI 도입 |
| 2 | 인메모리 캐시만 사용 | 확장성 | Redis 도입 검토 |
| 3 | DB 연결 풀링 없음 | 성능 | Prisma connection_limit 설정 |
| 4 | 에러 추적 없음 (Sentry) | 운영 | Sentry 도입 |
| 5 | 캐시 TTL 정리 없음 | 메모리 | 정기 정책 추가 |
| 6 | 의존성 일부 구버전 | 보안 | requirements.txt 업데이트 |
| 7 | docker-compose 하드코딩 비밀번호 | 보안 | 환경변수 사용 |

---

## 5. 개선 로드맵

### Phase 1: 보안 및 안정화 (1주)

**목표**: Critical 이슈 해결

1. **API 키 보안** (P0)
   - [ ] .env.example에서 실제 키 제거
   - [ ] 노출된 키 폐기 및 재발급
   - [ ] Git 히스토리 정화 (BFG Repo-Cleaner)

2. **인증 시스템 구현** (P0)
   - [ ] NextAuth.js 또는 Clerk 선택
   - [ ] 로그인/로그아웃 구현
   - [ ] 미들웨어로 demo user 패턴 제거

3. **테스트 인프라** (P0)
   - [ ] Vitest 설정
   - [ ] 핵심 API 단위 테스트
   - [ ] CI에 테스트 통합

4. **CI/CD 파이프라인** (P0)
   - [ ] GitHub Actions workflow 생성
   - [ ] Lint, Test, Build job 구성

### Phase 2: 품질 개선 (1주)

**목표**: High Priority 이슈 해결

1. **로깅 시스템** (P1)
   - [ ] Pino 설치 및 설정
   - [ ] console.log를 로거로 대체
   - [ ] JSON 포맷 구조화된 로그

2. **환경변수 검증** (P1)
   - [ ] 시작 시 필수 변수 확인
   - [ ] 명확한 에러 메시지

3. **UX 개선** (P1)
   - [ ] Toast/Alert 컴포넌트
   - [ ] 사용자 피드백 표시

4. **Docker 보안** (P1)
   - [ ] 비root 사용자 추가
   - [ ] 최소 권한 실행

5. **MX 태깅** (P1)
   - [ ] /moai mx 실행
   - [ ] @MX:ANCHOR, @MX:NOTE 추가

### Phase 3: 운영 준비 (1주)

**목표**: Medium Priority 이슈 해결

1. **모니터링** (P2)
   - [ ] 헬스체크 개선 (DB, Python)
   - [ ] Sentry 에러 추적

2. **성능 최적화** (P2)
   - [ ] DB 연결 풀링 설정
   - [ ] 캐시 정책 검토

3. **API 문서화** (P2)
   - [ ] OpenAPI 스펙 작성
   - [ ] Swagger UI 통합

---

## 6. 상세 권장사항

### 6.1 인증 시스템 아키텍처

```typescript
// 권장: NextAuth.js Middleware
// src/middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
})

export const config = {
  matcher: ["/api/watchlist/:path*", "/api/protected/:path*"]
}
```

### 6.2 환경변수 검증

```typescript
// src/lib/env.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'DART_API_KEY',
  'KIWOOM_APP_KEY',
  'KIWOOM_SECRET_KEY'
] as const

export function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}

// app/layout.tsx - 시작 시 검증
validateEnv()
```

### 6.3 구조화된 로깅

```typescript
// src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

// 사용 예시
logger.info({ userId, action }, 'Stock added to watchlist')
logger.error({ error, stack }, 'Failed to fetch stock data')
```

### 6.4 CI/CD 파이프라인

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
```

---

## 7. 성공 기준

### Phase 1 완료 기준
- [ ] .env.example에 placeholder만 존재
- [ ] 인증 미들웨어 동작
- [ ] 테스트 커버리지 > 30%
- [ ] CI 파이프라인 통과

### Phase 2 완료 기준
- [ ] console.log가 0개 (프로덕션 코드)
- [ ] 환경변수 누락 시 시작 실패
- [ ] 에러 발생 시 사용자에게 알림
- [ ] Docker 비root 사용자 실행
- [ ] @MX 태그 10+개 추가

### Phase 3 완료 기준
- [ ] 헬스체크에서 DB/Python 상태 확인
- [ ] Sentry 에러 수집 동작
- [ ] OpenAPI 스펙 완성

---

## 8. 리스크 평가

| 리스크 | 영향 | 완화 계획 |
|--------|------|-----------|
| API 키 노출 이력 | 높음 | 키 폐기, 재발급, 히스토리 정화 |
| 인증 구현 지연 | 중간 | P0 우선순위, 1주일 완료 목표 |
| 테스트 추가 부담 | 낮음 | 점진적 추가, 핵심 경로 먼저 |
| CI/CD 구현 복잡도 | 낮음 | GitHub Actions 템플릿 사용 |

---

**보고서 생성일**: 2026-02-28
**다음 단계**: 사용자 승인 후 Phase 1 구현 시작
