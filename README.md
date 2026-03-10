# Stock Watchlist 📈

한국 주식 시장의 실시간 정보를 추적하고 관리하는 웹 애플리케이션입니다.

## 🚀 현재 상태 (2025-09-04 15:30)

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
- **주가 차트 기능** (SPEC-CHART-001):
  - 일봉(1M/3M/6M/1Y) 및 주봉(5Y) 차트
  - 캔들스틱 및 라인 차트 전환
  - 자동 페이지네이션 (최대 5회)
  - 캐싱 최적화 (일봉 1시간, 주봉 1일 TTL)
- Docker 컨테이너 기반 개발환경 구축
- 애플리케이션 로고 제작 및 브랜딩 완료

### 🔧 기술 스택
- **Frontend**: Next.js 15.5.2 + React 19 + TypeScript
- **Backend**: Next.js API Routes + TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Prisma 6.15.0
- **Styling**: Tailwind CSS v4
- **Stock Data API**: 키움증권 REST API (OAuth2 인증)
- **Chart Library**: lightweight-charts v5.1.0 (TradingView OSS)
- **Additional APIs**: 네이버 금융 API, DART API
- **Testing**: Vitest + TypeScript (62 테스트)
- **Containerization**: Docker + Docker Compose
- **배포**: Railway (Docker 컨테이너)

### 📊 데이터 소스
- **키움증권 REST API**: 주식 시세, 종목 정보 (OAuth2 인증)
- **네이버 금융 API**: 뉴스 정보
- **DART API**: 전자공시시스템 정보

## 🏃‍♂️ 개발 환경 설정

### 📋 사전 요구사항
- Node.js 18+ 
- Docker & Docker Compose
- Git

### 🚀 빠른 시작 (Docker 권장)

#### 1. 레포지토리 클론
```bash
git clone https://github.com/ip9202/stock-watchlist.git
cd stock-watchlist
```

#### 2. 환경변수 설정
```bash
# .env.local 파일 생성 (예시는 .env.example 참고)
cp .env.example .env.local

# 필수 API 키 설정
KIWOOM_APP_KEY=your_kiwoom_app_key
KIWOOM_SECRET_KEY=your_kiwoom_secret_key
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
DART_API_KEY=your_dart_api_key
```

#### 3. Docker로 전체 환경 시작
```bash
# 모든 서비스 시작 (백그라운드)
docker-compose up --build -d

# 로그 확인
docker-compose logs -f app
```

#### 4. 접속 정보
- **애플리케이션**: http://localhost:3002
- **데이터베이스**: localhost:5434 (PostgreSQL)

### 🔧 로컬 개발 (Node.js 직접 실행)

#### 1. 의존성 설치 및 데이터베이스 설정
```bash
npm install
npm run db:generate
npm run db:migrate
```

#### 2. 개발 서버 실행
```bash
npm run dev
```
- **Frontend**: http://localhost:3001 (포트 3000이 사용 중이면 자동 변경)

#### 3. 데이터베이스 관리
```bash
npm run db:studio
```
- **Prisma Studio**: http://localhost:5556

### 📝 주요 명령어

#### Docker 관리
```bash
# 컨테이너 시작
docker-compose up -d

# 컨테이너 중지
docker-compose down

# 완전 정리 (볼륨, 이미지 포함)
docker-compose down --volumes --rmi all

# 앱 컨테이너만 재빌드
docker-compose build --no-cache app
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
│   ├── api/           # API 라우트
│   ├── stock/         # 개별 주식 페이지
│   └── page.tsx       # 메인 대시보드
├── components/
│   ├── ui/            # 기본 UI 컴포넌트
│   ├── dashboard/     # 대시보드 컴포넌트
│   └── layout/        # 레이아웃 컴포넌트
└── types/             # TypeScript 타입 정의

prisma/
├── schema.prisma      # 데이터베이스 스키마
└── migrations/        # 마이그레이션 파일

scripts/               # Python 데이터 수집 스크립트
```

## 🚀 배포 (Railway)

### 📋 배포 준비사항
- GitHub 레포지토리에 코드 업로드 완료
- API 키 발급 (네이버, DART)
- Railway 계정 생성

### 🏗️ Railway 배포 단계

#### 1. Railway 프로젝트 생성
1. [Railway.app](https://railway.app) 접속
2. "New Project" → "Deploy from GitHub repo" 선택  
3. `ip9202/stock-watchlist` 레포지토리 선택
4. "Deploy Now" 클릭

#### 2. 데이터베이스 추가
1. 프로젝트 대시보드에서 "Add Service" 클릭
2. "Database" → "PostgreSQL" 선택
3. 자동으로 PostgreSQL 인스턴스 생성됨

#### 3. 환경변수 설정
애플리케이션 서비스의 Variables 탭에서 다음 변수들 설정:

```bash
# 자동 생성 (Railway가 제공)
DATABASE_URL=postgresql://postgres:password@host:port/database
PORT=3000

# 수동 설정 필요
NODE_ENV=production
PYTHONPATH=/app  
PYTHON_UNBUFFERED=1

# API 키들 (실제 값으로 교체)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
DART_API_KEY=your_dart_api_key
```

#### 4. 자동 배포
- GitHub 레포지토리 변경 시 자동 재배포
- Docker 멀티스테이지 빌드 사용
- 예상 빌드 시간: 5-10분 (초기), 2-3분 (이후)

### 🔍 배포 후 확인사항
- ✅ 애플리케이션 정상 접속
- ✅ API 응답 확인: `/api/health`
- ✅ 주식 데이터 조회: `/api/stocks/005930`
- ✅ 데이터베이스 연결 상태

## 📊 API 예시

### 주식 정보 조회 (삼성전자)
```bash
curl https://your-railway-app.up.railway.app/api/stocks/005930
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
    "timestamp": "2025-09-04T06:25:21.301Z",
    "extra_info": {
      "data_source": "PyKRX (한국거래소)",
      "last_updated": "2025-09-04 06:25:21",
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

## 🛠️ 개발 히스토리

### v1.1.0 (2026-03-10)
- ✅ **키움증권 REST API 완전 전환** (SPEC-API-001)
  - OAuth2 토큰 관리 모듈 (`src/lib/kiwoom-token-manager.ts`)
  - REST API 클라이언트 (`src/lib/kiwoom-stock-api.ts`)
  - PyKRX 종목 검색 → 키움증권 REST API로 전환
  - WebSocket 개별 시세 → REST API로 전환
- ✅ TypeScript 기반 직접 HTTP 호출 (child_process 제거)
- ✅ Vitest를 사용한 포괄적 테스트 (36 테스트, 100% 통과)
- ✅ 코드 커버리지 ~90% 달성
- ✅ 기존 API 응답 형식 완벽 유지 (프론트엔드 변경 불필요)

### v1.0.0 (2025-09-04)
- ✅ PyKRX 데이터 소스 전환 (Yahoo Finance 대체)
- ✅ 확장된 주식 데이터 제공 (거래대금, 거래량비중 등)
- ✅ Docker 컨테이너 기반 개발환경 구축
- ✅ Railway 배포 최적화
- ✅ 한국투자증권 API 의존성 제거
- ✅ 애플리케이션 로고 제작

### v0.9.0 (2025-09-02)
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
