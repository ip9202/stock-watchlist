# Stock Watchlist 📈

한국 주식 시장의 실시간 정보를 추적하고 관리하는 웹 애플리케이션입니다.

## 🚀 현재 상태 (2026-03-15)

### ✅ 완료된 기능
- 기본 프로젝트 구조 설정 및 TypeScript 환경 구축
- 데이터베이스 스키마 설계 (User, Watchlist, StockPrice, News, Disclosure)
- PostgreSQL 연결 설정 및 Prisma ORM 통합
- API 라우트 구현 (주식 정보, 뉴스, 공시, 워치리스트 관리)
- 반응형 UI 컴포넌트 구현 (검색, 주식카드, 뉴스 등)
- Python 데이터 수집 스크립트 (PyKRX + 네이버 API 연동)
- 실시간 데이터 캐싱 시스템 (30초 TTL)
- 한글 검색어 처리 및 환경변수 전달 시스템
- 검색 UX 개선 (로딩 상태, 디바운싱)
- **확장된 주식 데이터 제공**:
  - 기본 OHLCV (시가/고가/저가/종가/거래량)
  - 시가총액, 거래대금, 상장주식수
  - 거래량 비중 (30일 평균 대비)
  - 52주 최고가/최저가
  - 등락률/등락폭
- **주가 차트 기능** (SPEC-CHART-001 ~ SPEC-CHART-003):
  - 봉 타입(일봉/주봉/월봉) + 기간(1일/3개월/1년/3년/10년) 상호 배타적 선택
  - 캔들스틱 차트 (봉 타입 선택 시) 및 라인 차트 (기간 선택 시)
  - 1일 인트라데이 차트: 분봉(ka10080, tic_scope=1) API로 장중 가격 변동 표시
  - 동적 응답 키 탐색으로 API 호환성 강화
  - 장외시간 지원 (1일 차트, filterLatestTradingDay)
  - 캐싱 최적화 (분봉 5분, 일봉 1시간, 주봉/월봉 1일 TTL)
- **토큰 만료 자동 재시도** (SPEC-API-002):
  - Promise 기반 동시 토큰 갱신 중복 제거
  - API 에러 레벨 토큰 만료 감지 및 자동 재시도
  - [8005] 토큰 에러 자동 감지 및 1회 재시도
- **뉴스/공시 API Node.js 전환** (2026-03-12):
  - Python executeScript 완전 제거
  - 네이버 뉴스 API: Node.js native fetch로 직접 호출 (NAVER_CLIENT_ID/SECRET)
  - DART 공시 API: Node.js native fetch로 직접 호출 (DART_API_KEY)
  - 미설정 시 샘플 데이터 자동 반환
- **프로덕션 배포 구축** (2026-03-12):
  - Docker 제거 → Next.js standalone + PM2 + Nginx
  - URL: https://ip9202.site/stocks (basePath: /stocks, port 3005)
  - apiFetch/apiUrl로 클라이언트 fetch에 basePath 자동 적용
  - 배포 스크립트: ./deploy/deploy.sh (--full, --db 옵션)

### 🔧 기술 스택
- **Frontend**: Next.js 15.5.2 + React 19 + TypeScript
- **Backend**: Next.js API Routes + TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Prisma 6.15.0
- **Styling**: Tailwind CSS v4
- **Stock Data API**: 키움증권 REST API (OAuth2 인증)
- **Chart Library**: lightweight-charts v5.1.0 (TradingView OSS)
- **Additional APIs**: 네이버 금융 API, DART API
- **Testing**: Vitest + TypeScript (110 테스트, ~90% 커버리지)
- **배포**: Next.js standalone + PM2 + Nginx (pm2.ecosystem.config.js)

### 📊 데이터 소스
- **키움증권 REST API**: 주식 시세, 종목 정보 (OAuth2 인증)
- **네이버 금융 API**: 뉴스 정보
- **DART API**: 전자공시시스템 정보

## 🏃‍♂️ 개발 환경 설정

### 📋 사전 요구사항
- Node.js 20+ (v25.2.1 권장)
- PostgreSQL 18 로컬 실행 (`brew services start postgresql@18`)
- Git

### 🚀 빠른 시작

#### 1. 레포지토리 클론
```bash
git clone https://github.com/ip9202/stock-watchlist.git
cd stock-watchlist
```

#### 2. 환경변수 설정
```bash
# .env.local 파일 생성
cp .env.example .env.local

# 필수 환경변수
DATABASE_URL=postgresql://localhost:5432/stock_watchlist_dev
KIWOOM_APP_KEY=your_kiwoom_app_key
KIWOOM_SECRET_KEY=your_kiwoom_secret_key

# 선택 환경변수 (미설정 시 샘플 데이터 반환)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
DART_API_KEY=your_dart_api_key
```

#### 3. 의존성 설치 및 데이터베이스 초기화
```bash
npm install
npm run db:generate    # Prisma 클라이언트 생성
npm run db:migrate     # 마이그레이션 실행
```

#### 4. 개발 서버 실행
```bash
npm run dev
```
- **애플리케이션**: http://localhost:3000 (포트 3000이 사용 중이면 자동 변경)

#### 5. 데이터베이스 관리
```bash
npm run db:studio
```
- **Prisma Studio**: http://localhost:5556

### 📝 주요 명령어

#### 개발 및 빌드
```bash
npm run dev            # 개발 서버 실행
npm run build          # 프로덕션 빌드
npm run start          # 프로덕션 서버 실행
npm run test           # 테스트 실행 (Vitest)
npm run lint           # 린트 검사 (ESLint)
```

#### 데이터베이스 관리
```bash
npm run db:generate    # Prisma 클라이언트 생성
npm run db:migrate     # 마이그레이션 실행
npm run db:studio      # Prisma Studio 실행
```

## 📁 프로젝트 구조
```
src/
├── app/
│   ├── api/
│   │   ├── stocks/            # 주식 검색, 상세 정보, 차트 API
│   │   ├── news/              # 뉴스 API (Node.js fetch)
│   │   └── disclosure/        # 공시 API (Node.js fetch)
│   ├── stock/[symbol]/        # 개별 주식 페이지
│   └── page.tsx               # 메인 대시보드
├── components/
│   ├── dashboard/             # 검색, 카드, 관리 컴포넌트
│   ├── chart/                 # 차트 컴포넌트 (StockChart, ChartToolbar, ChartContainer)
│   └── layout/                # 레이아웃 컴포넌트
├── lib/
│   ├── kiwoom-token-manager.ts  # OAuth2 토큰 관리 (singleton, auto-refresh)
│   ├── kiwoom-stock-api.ts      # 키움 REST API 클라이언트
│   ├── cache.ts                 # 인메모리 캐싱 시스템
│   ├── api.ts                   # apiUrl, apiFetch (basePath 적용)
│   ├── env.ts                   # 환경변수 검증
│   └── python-executor.ts       # Python 실행기 (executeScript만 export)
└── types/                     # TypeScript 타입 정의

prisma/
├── schema.prisma              # 데이터베이스 스키마
└── migrations/                # 마이그레이션 파일

deploy/
└── deploy.sh                  # 프로덕션 배포 스크립트 (--full, --db 옵션)

scripts/                        # 독립형 유틸리티 (앱에 import되지 않음)
```

## 🚀 배포 (프로덕션)

### 📋 배포 준비사항
- Next.js standalone 빌드 완료
- PostgreSQL 데이터베이스 준비
- PM2 및 Nginx 설치 (서버 환경)
- API 키 설정 (KIWOOM, NAVER, DART)

### 🏗️ 배포 단계

#### 1. 빌드 및 배포
```bash
# 서버 환경 설정
cd ~/projects/stock-watchlist

# 의존성 설치
npm install --production

# Prisma 생성
npx prisma generate

# 프로덕션 빌드
npm run build

# 데이터베이스 마이그레이션 (초기 배포 시만)
./node_modules/.bin/prisma migrate deploy

# PM2로 서버 시작
pm2 start pm2.ecosystem.config.js
```

#### 2. Nginx 설정
Nginx는 다음 3단계 로케이션으로 구성:
- `/stocks/_next/static/` → Next.js 정적 자산 (캐시 1년)
- `/stocks/_next/` → Next.js 빌드 파일 (캐시 1일)
- `/stocks/` → Node.js 애플리케이션 (포트 3005)

basePath '/stocks'로 인한 rewrite 불필요

#### 3. 환경변수 설정
서버 `.env` 파일 설정:
```bash
PORT=3005
HOSTNAME=0.0.0.0
DATABASE_URL=postgresql://user:password@localhost:5432/stock_watchlist_prod
KIWOOM_APP_KEY=your_key
KIWOOM_SECRET_KEY=your_secret
NAVER_CLIENT_ID=your_id
NAVER_CLIENT_SECRET=your_secret
DART_API_KEY=your_api_key
```

#### 4. 배포 스크립트 사용
```bash
# 전체 배포 (node_modules 포함)
./deploy/deploy.sh --full

# 데이터베이스만 마이그레이션
./deploy/deploy.sh --db

# 일반 배포
./deploy/deploy.sh
```

### 🔍 배포 후 확인사항
- ✅ 애플리케이션 정상 접속: https://ip9202.site/stocks
- ✅ API 응답 확인: `/api/stocks/005930`
- ✅ 뉴스/공시 데이터 조회
- ✅ 차트 데이터 조회
- ✅ PM2 프로세스 상태: `pm2 status`

## 📊 API 예시

### 주식 정보 조회 (삼성전자)
```bash
curl https://ip9202.site/stocks/api/stocks/005930
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "symbol": "005930",
    "name": "삼성전자",
    "price": 69800,
    "changeAmount": 300,
    "changePercent": 0.43,
    "volume": 10455998,
    "marketCap": 412598763163400,
    "tradingValue": 741613842413,
    "sharesOutstanding": 5919637922,
    "volumeRatio": 80,
    "high": 69900,
    "low": 69300,
    "open": 69500,
    "previousClose": 69500,
    "high52w": 74000,
    "low52w": 49900,
    "timestamp": "2026-03-15T06:25:21.301Z",
    "extra_info": {
      "data_source": "키움증권 REST API",
      "last_updated": "2026-03-15 06:25:21",
      "is_etf": false
    }
  }
}
```

### 주요 데이터 필드
- **tradingValue**: 거래대금 (원)
- **sharesOutstanding**: 상장주식수 (주)
- **volumeRatio**: 거래량 비중 (30일 평균 대비 %)
- **marketCap**: 시가총액 (원)
- **high52w/low52w**: 52주 최고가/최저가

### 주식 차트 조회
```bash
# 일봉 차트 (3개월)
curl "https://ip9202.site/stocks/api/stocks/005930/chart?interval=day&period=3M"

# 분봉 차트 (1일)
curl "https://ip9202.site/stocks/api/stocks/005930/chart?interval=minute&period=1D"
```

## 🛠️ 개발 히스토리

### v1.2.0 (2026-03-15)
- ✅ **차트 UI 개편 및 기능 확장** (SPEC-CHART-002, SPEC-CHART-003)
  - 봉 타입(일봉/주봉/월봉) + 기간(1일/3개월/1년/3년/10년) 상호 배타적 선택
  - 월봉 차트 API (ka10083) 추가
  - 1일 인트라데이 차트: 분봉(ka10080) 기반 분 단위 가격 변동 표시
  - 차트 데이터 중복 제거 (Map 기반, 페이지네이션 경계 처리)
- ✅ **API 호환성 강화** (2026-03-11)
  - 동적 응답 키 탐색 (extractChartCandles, stk_*_pole_chart_qry 패턴)
  - cont-yn/next-key 페이지네이션 요청 헤더 지원
  - 장외시간 지원 (filterLatestTradingDay)
  - 분봉 타임존 수정 (Date.UTC 직접 파싱)
- ✅ **뉴스/공시 API Node.js 전환** (2026-03-12)
  - Python executeScript 완전 제거
  - 네이버 뉴스 API: Node.js native fetch (NAVER_CLIENT_ID/SECRET)
  - DART 공시 API: Node.js native fetch (DART_API_KEY)
  - 미설정 시 샘플 데이터 자동 반환
- ✅ **프로덕션 배포 구축** (2026-03-12)
  - Docker 제거 → Next.js standalone + PM2 + Nginx
  - URL: https://ip9202.site/stocks (basePath: /stocks, port 3005)
  - apiFetch/apiUrl로 클라이언트 fetch에 basePath 자동 적용
  - 배포 스크립트 추가
- ✅ Vitest 110 테스트, ~90% 커버리지
- ✅ UI 텍스트 수정 (데이터 소스 레이블, 커뮤니티 링크)

### v1.1.0 (2026-03-10)
- ✅ **키움증권 REST API 완전 전환** (SPEC-API-001)
  - OAuth2 토큰 관리 모듈 (`src/lib/kiwoom-token-manager.ts`)
  - REST API 클라이언트 (`src/lib/kiwoom-stock-api.ts`)
  - PyKRX 종목 검색 → 키움증권 REST API로 전환
  - WebSocket 개별 시세 → REST API로 전환
- ✅ **키움 REST API 차트 기능 구현** (SPEC-CHART-001)
  - 일봉/주봉 차트 API
  - lightweight-charts v5 프론트엔드 통합
  - 자동 페이지네이션 및 캐싱 최적화
- ✅ **키움 REST API 토큰 만료 처리 강화** (SPEC-API-002)
  - Promise 기반 동시 토큰 갱신 중복 제거
  - API 레벨 토큰 에러 감지 및 자동 재시도
  - [8005] 토큰 에러 1회 자동 재시도
- ✅ Vitest 포괄적 테스트 (72 테스트)

### v1.0.0 (2025-09-04)
- ✅ 기본 Next.js 프로젝트 구조
- ✅ Prisma ORM + PostgreSQL 연동
- ✅ 기본 API 라우트 구현
- ✅ UI 컴포넌트 구축

## 🤝 기여하기

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트 링크: [https://github.com/ip9202/stock-watchlist](https://github.com/ip9202/stock-watchlist)
