# Stock Watchlist 📈

한국 주식 시장의 실시간 정보를 추적하고 관리하는 웹 애플리케이션입니다.

## 🚀 현재 상태 (2025-09-02 18:00)

### ✅ 완료된 기능
- 기본 프로젝트 구조 설정 및 TypeScript 환경 구축
- 데이터베이스 스키마 설계 (User, Watchlist, StockPrice, News, Disclosure)
- 로컬 PostgreSQL 연결 설정 및 Prisma ORM 통합
- API 라우트 구현 (주식 정보, 뉴스, 공시, 워치리스트 관리)
- 반응형 UI 컴포넌트 구현 (검색, 주식카드, 뉴스 등)
- Python 데이터 수집 스크립트 (conda py3_12 환경 연동)
- 실시간 데이터 캐싱 시스템 (30초 TTL)
- 한글 검색어 처리 및 환경변수 전달 시스템
- 검색 UX 개선 (로딩 상태, 디바운싱)
- Vercel 배포 설정 파일 준비

### 🔧 기술 스택
- **Frontend**: Next.js 15.5.2 + React 19 + TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Tailwind CSS v4
- **Data Collection**: Python + conda 환경
- **배포**: Railway (Docker 컨테이너)

## 🏃‍♂️ 로컬 개발 시작하기

### 1. 개발 서버 실행
```bash
npm run dev
```
- **Frontend**: http://localhost:3001
- 포트 3000이 사용 중일 때 자동으로 3001로 변경됨

### 2. 데이터베이스 관리
```bash
# Prisma Studio 실행 (데이터베이스 GUI)
npm run db:studio
```
- **Prisma Studio**: http://localhost:5556
- 데이터베이스 테이블과 데이터를 시각적으로 관리

### 3. 주요 명령어
```bash
# 데이터베이스 마이그레이션
npm run db:migrate

# Prisma 클라이언트 생성
npm run db:generate

# Python 환경 활성화 (데이터 수집용)
conda activate py3_12
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

## 🚀 배포 (Railway + Docker)

### 1. GitHub Repository
```bash
# GitHub에 코드 push
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. Railway 배포
- Railway 프로젝트 생성
- GitHub 레포지토리 연결
- Docker 컨테이너 자동 빌드 및 배포
- 환경변수 설정 (DATABASE_URL, API_KEY 등)
