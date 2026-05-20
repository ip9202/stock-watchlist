# DevOps 및 배포 준비 상태 분석 보고서

**작성일**: 2026-02-28
**분석 범위**: 컨테이너화, 배포 설정, CI/CD, 모니터링, 보안, 확장성

---

## 1. 컨테이너화 분석

### 1.1 Dockerfile 평가

**파일**: `Dockerfile`

#### 장점
- ✅ Multi-stage 빌드 사용 (python-stage → production)
- ✅ 명시적인 Python 3.12 버전 지정
- ✅ Node.js 18 LTS 통합
- ✅ HEALTHCHECK 명령어 포함
- ✅ 전용 entrypoint 스크립트 사용

#### 문제점
- ⚠️ **이미지 크기 최적화 부족**: `python:3.12-slim` 기반이나 build-essential, gcc, g++ 포함으로 이미지 크기 증가
- ⚠️ **캐시 레이어 미활용**: requirements.txt 변경 시 전체 재빌드 필요
- ⚠️ **불필요한 패키지 설치**: kiwoom-restful 설치 실패 시 무시 (`|| echo` 패턴)
- ⚠️ **보안 문제**: root 사용자로 실행

#### 개선 권장사항
```dockerfile
# 권장: 비root 사용자 실행
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# 권장: 레이어 캐시 최적화
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```

### 1.2 docker-compose.yml 평가

**파일**: `docker-compose.yml`

#### 장점
- ✅ PostgreSQL 15 Alpine 사용 (경량)
- ✅ healthcheck 의존성 설정 (`depends_on: condition: service_healthy`)
- ✅ 볼륨 영속성 설정
- ✅ 네트워크 분리 (stock_network)

#### 문제점
- ⚠️ **하드코딩된 비밀번호**: `POSTGRES_PASSWORD: stock_password`
- ⚠️ **포트 노출**: PostgreSQL 5434 포트가 외부에 노출됨
- ⚠️ **환경변수 기본값 노출**: 민감한 API 키의 기본값이 코드에 포함

---

## 2. 배포 설정 분석

### 2.1 Railway 배포

#### 현황
- Railway 배포 문서는 존재하나 전용 설정 파일(railway.toml/nixpacks.toml) 없음
- 수동 배포 프로세스로 추정

#### 문제점
- ❌ **CI/CD 파이프라인 없음**: 자동 배포 불가
- ❌ **환경변수 관리 미흡**: .env 파일에 의존
- ⚠️ **데이터베이스 마이그레이션**: entrypoint에서 `prisma db push --accept-data-loss` 사용 (위험)

### 2.2 환경변수 관리

**파일**: `.env.example`, `.env.local`, `.env.production`

#### 문제점
- 🔴 **심각**: `.env.example`에 실제 API 키가 포함됨
  - `KIWOOM_APP_KEY`, `KIWOOM_SECRET_KEY`, `DART_API_KEY`
- ⚠️ 환경별 설정 파일이 `.gitignore`에 있으나 example에 실제 키 노출

#### 즉시 조치 필요
```bash
# .env.example에서 실제 키 제거 필수
KIWOOM_APP_KEY="your_kiwoom_app_key_here"
KIWOOM_SECRET_KEY="your_kiwoom_secret_key_here"
DART_API_KEY="your_dart_api_key_here"
```

---

## 3. CI/CD 평가

### 3.1 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| GitHub Actions | ❌ 없음 | `.github/workflows/` 디렉토리 없음 |
| 자동 테스트 | ❌ 없음 | CI에서 테스트 실행 불가 |
| 자동 배포 | ❌ 없음 | 수동 배포만 가능 |
| PR 검증 | ❌ 없음 | 코드 품질 자동 검증 없음 |
| 의존성 스캔 | ❌ 없음 | 보안 취약점 자동 감지 없음 |

### 3.2 권장 CI/CD 파이프라인

```yaml
# .github/workflows/ci.yml (권장)
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

---

## 4. 모니터링 및 로깅

### 4.1 헬스체크

**파일**: `src/app/api/health/route.ts`

#### 현황
- ✅ 기본 헬스체크 엔드포인트 존재
- ⚠️ 데이터베이스 연결 상태 미확인
- ⚠️ Python 스크립트 실행 가능 여부 미확인

#### 개선 권장사항
```typescript
// 권장: 종합적인 헬스체크
export async function GET() {
  const checks = {
    database: await checkDatabaseConnection(),
    python: await checkPythonAvailability(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  }

  const isHealthy = Object.values(checks).every(c => c.status !== 'error')
  return NextResponse.json(
    { status: isHealthy ? 'healthy' : 'degraded', checks },
    { status: isHealthy ? 200 : 503 }
  )
}
```

### 4.2 로깅

#### 현황
- ❌ **로깅 프레임워크 없음**: `console.log`만 사용 (15개 파일에서 발견)
- ❌ **구조화된 로그 없음**: JSON 포맷 미사용
- ❌ **로그 레벨 미구분**: debug/info/warn/error 구분 없음
- ❌ **외부 로그 수집 없음**: Sentry, Datadog 등 미연동

### 4.3 에러 추적

- ❌ Sentry 또는 유사 도구 미사용
- ❌ 에러 리포팅 메커니즘 없음

---

## 5. 보안 강화

### 5.1 컨테이너 보안

| 항목 | 상태 | 위험도 |
|------|------|--------|
| Root 사용자 실행 | ⚠️ 예 | 중간 |
| 이미지 스캔 | ❌ 없음 | 높음 |
| 시크릿 관리 | ⚠️ env 파일 | 중간 |
| 네트워크 격리 | ✅ 있음 | 낮음 |

### 5.2 시크릿 관리

#### 문제점
- 🔴 `.env.example`에 실제 API 키 노출
- ⚠️ Docker 이미지에 환경변수 평문 전달
- ⚠️ Kubernetes/Docker Secrets 미사용

### 5.3 의존성 보안

```bash
# 권장: 정기적 의존성 스캔
npm audit
npm audit fix
# 또는 Snyk, Dependabot 사용
```

### 5.4 Python 스크립트 실행 보안

**파일**: `src/lib/python-executor.ts`

#### 보안 우려
- ⚠️ **명령어 인젝션 가능성**: 인자 이스케이프 로직이 완전하지 않음
- ⚠️ **셸 명령어 사용**: `source`, `conda activate` 실행

#### 개선 권장사항
```typescript
// 권장: spawn 사용으로 인젝션 방지
import { spawn } from 'child_process'

export async function executeScript(scriptPath: string, args: string[]) {
  const proc = spawn('python3', [scriptPath, ...args], {
    env: process.env,
    timeout: 30000
  })
  // ...
}
```

---

## 6. 확장성 준비

### 6.1 수평 확장 (Horizontal Scaling)

| 항목 | 상태 | 영향 |
|------|------|------|
| Stateless 설계 | ✅ 있음 | 긍정적 |
| 세션 스토리지 | ❌ 없음 | 문제없음 (세션 미사용) |
| 파일 스토리지 | ⚠️ 로컬 | 부정적 |
| WebSocket | ❌ 없음 | 문제없음 |

### 6.2 데이터베이스 연결 풀링

**파일**: `src/lib/db.ts`, `prisma/schema.prisma`

#### 현황
- ⚠️ **연결 풀 설정 없음**: Prisma 기본 설정 사용
- ⚠️ **PgBouncer 미사용**: 트랜잭션 모드 필요시 문제

#### 개선 권장사항
```prisma
// prisma/schema.prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DATABASE_DIRECT_URL")  // 마이그레이션용
  relationMode = "prisma"
}

// DATABASE_URL에 연결 풀 파라미터 추가
// postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=10
```

### 6.3 캐싱 전략

**파일**: `src/lib/cache.ts`

#### 현황
- ⚠️ **인메모리 캐시만 사용**: 다중 인스턴스 시 캐시 불일치
- ⚠️ **Redis 없음**: 분산 캐시 미지원
- ⚠️ **캐시 무효화 전략 없음**: TTL만 의존

#### 개선 권장사항
```typescript
// 권장: Redis 캐시 도입
import { Redis } from 'ioredis'

class DistributedCache {
  private redis: Redis

  async get(key: string) {
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async set(key: string, value: any, ttl: number) {
    await this.redis.setex(key, ttl, JSON.stringify(value))
  }
}
```

---

## 7. 요약 및 우선순위

### 즉시 조치 필요 (Critical)
1. 🔴 `.env.example`에서 실제 API 키 제거
2. 🔴 CI/CD 파이프라인 구축 (GitHub Actions)

### 단기 개선 (High)
3. 🟠 Dockerfile에 비root 사용자 적용
4. 🟠 구조화된 로깅 도입 (winston/pino)
5. 🟠 데이터베이스 연결 풀링 설정

### 중기 개선 (Medium)
6. 🟡 헬스체크 개선 (DB, Python 상태 포함)
7. 🟡 Redis 캐싱 도입
8. 🟡 Sentry 에러 추적 도입

### 장기 개선 (Low)
9. 🟢 이미지 스캔 자동화
10. 🟢 Kubernetes 배포 설정

---

## 첨부: 분석 대상 파일 목록

| 파일 | 경로 | 분석 항목 |
|------|------|-----------|
| Dockerfile | `./Dockerfile` | 컨테이너화 |
| docker-compose.yml | `./docker-compose.yml` | 오케스트레이션 |
| docker-entrypoint.sh | `./docker-entrypoint.sh` | 시작 스크립트 |
| package.json | `./package.json` | 빌드 스크립트 |
| requirements.txt | `./requirements.txt` | Python 의존성 |
| .env.example | `./.env.example` | 환경변수 템플릿 |
| prisma/schema.prisma | `./prisma/schema.prisma` | DB 스키마 |
| src/lib/db.ts | `./src/lib/db.ts` | DB 연결 |
| src/lib/cache.ts | `./src/lib/cache.ts` | 캐싱 |
| src/lib/python-executor.ts | `./src/lib/python-executor.ts` | Python 실행 |
| src/app/api/health/route.ts | `./src/app/api/health/route.ts` | 헬스체크 |
