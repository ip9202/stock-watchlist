# Stock Watchlist - 프로젝트 구조

## 디렉토리 구조

```
stock_watchlist/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API 라우트
│   │   │   ├── stocks/         # 주식 정보 API
│   │   │   │   └── [symbol]/   # 개별 종목
│   │   │   │       └── chart/  # 차트 데이터 API
│   │   │   ├── watchlist/      # 관심종목 API
│   │   │   ├── disclosures/    # 공시 정보 API
│   │   │   └── health/         # 헬스체크 API
│   │   ├── stock/[symbol]/     # 개별 종목 페이지
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── page.tsx            # 메인 대시보드
│   │   └── globals.css         # 전역 스타일
│   ├── components/             # React 컴포넌트
│   │   ├── ui/                 # 기본 UI 컴포넌트
│   │   │   ├── button.tsx      # 버튼 컴포넌트
│   │   │   ├── card.tsx        # 카드 컴포넌트
│   │   │   ├── badge.tsx       # 배지 컴포넌트
│   │   │   ├── input.tsx       # 입력 컴포넌트
│   │   │   └── loading.tsx     # 로딩 컴포넌트
│   │   ├── dashboard/          # 대시보드 컴포넌트
│   │   │   ├── StockSearch.tsx # 종목 검색
│   │   │   ├── StockCard.tsx   # 주식 카드
│   │   │   └── WatchlistManager.tsx # 관심종목 관리
│   │   ├── chart/              # 차트 컴포넌트
│   │   │   ├── StockChart.tsx  # 차트 데이터 페칭 + 상태 관리
│   │   │   ├── ChartContainer.tsx # lightweight-charts 렌더링
│   │   │   ├── ChartToolbar.tsx # 봉 타입/기간 선택 UI (상호 배타적)
│   │   │   ├── chart-data-utils.ts # 차트 데이터 변환/중복제거 헬퍼
│   │   │   └── index.ts        # 배럴 내보내기
│   │   └── layout/             # 레이아웃 컴포넌트
│   │       └── Footer.tsx      # 푸터
│   ├── lib/                    # 유틸리티 라이브러리
│   │   ├── db.ts               # Prisma 클라이언트
│   │   ├── cache.ts            # 캐싱 유틸리티
│   │   ├── api.ts              # API 헬퍼 (apiUrl, apiFetch - basePath 적용)
│   │   ├── env.ts              # 환경 변수 검증
│   │   ├── kiwoom-token-manager.ts  # 키움 OAuth2 토큰 관리 (싱글톤)
│   │   ├── kiwoom-stock-api.ts # 키움 REST API 클라이언트
│   │   ├── utils.ts            # 일반 유틸리티
│   │   └── constants.ts        # 상수 정의
│   └── types/                  # TypeScript 타입
│       ├── stock.ts            # 주식 관련 타입
│       └── api.ts              # API 응답 타입
├── prisma/                     # Prisma ORM
│   ├── schema.prisma           # 데이터베이스 스키마
│   └── migrations/             # 마이그레이션 파일
├── scripts/                    # Python 데이터 수집 스크립트
│   ├── fetch_stock_data.py     # 주식 데이터 수집
│   ├── fetch_all_stocks.py     # 전종목 검색
│   ├── fetch_stock_news.py     # 뉴스 수집
│   └── fetch_disclosure.py     # 공시 수집
├── public/                     # 정적 파일
├── .moai/                      # MoAI 설정 및 문서
└── .env.local                  # 환경 변수 (로컬)
```

## 주요 파일 설명

### 프레임워크 설정

- **package.json**: 프로젝트 의존성 및 스크립트
- **next.config.mjs**: Next.js 설정
- **tailwind.config.ts**: Tailwind CSS 설정
- **tsconfig.json**: TypeScript 설정

### 진입점

- **src/app/page.tsx**: 메인 대시보드 페이지
- **src/app/layout.tsx**: 루트 레이아웃 (헤더, 스타일)
- **src/app/stock/[symbol]/page.tsx**: 개별 종목 상세 페이지

### API 라우트

- **api/stocks**: 주식 검색 및 정보 조회
- **api/watchlist**: 관심종목 CRUD
- **api/disclosures**: 공시 정보 조회
- **api/health**: 헬스체크

### 데이터 모델

```prisma
User        // 사용자
Watchlist   // 관심종목 (User와 관계)
StockPrice  // 주가 기록
News        // 뉴스 기사
Disclosure  // 공시 정보
```

## 모듈 조직화

### 프레젠테이션 계층 (React Components)
- **ui/**: 재사용 가능한 기본 컴포넌트
- **dashboard/**: 비즈니스 로직이 포함된 페이지별 컴포넌트
- **layout/**: 페이지 레이아웃 컴포넌트

### 비즈니스 로직 계층 (API Routes)
- RESTful API 설계
- Python 스크립트와의 통신
- 데이터베이스 CRUD 작업

### 데이터 액세스 계층 (Prisma)
- Prisma Client를 통한 ORM
- 타입 안전한 데이터베이스 쿼리

### 외부 데이터 소스
- **PyKRX**: 한국거래소 공식 데이터
- **네이버 금융**: 실시간 주가, 뉴스
- **DART**: 전자공시 정보

## 데이터 흐름

```
사용자 요청 → React Component → Next.js API Route
                                    ↓
                            Python 스크립트 실행 (child_process)
                                    ↓
                    외부 API 호출 (PyKRX/네이버/DART)
                                    ↓
                            데이터 파싱 및 가공
                                    ↓
                            Prisma로 DB 저장
                                    ↓
                            클라이언트에 JSON 응답
                                    ↓
                            React 상태 업데이트 (SWR)
```

## 주요 의존 관계

- React Components → API Routes (fetch)
- API Routes → Python Scripts (spawn)
- API Routes → Prisma Client
- Python Scripts → External APIs (PyKRX, 네이버, DART)
