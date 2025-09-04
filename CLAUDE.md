# Stock Watchlist - Claude 작업 기록

## 포트 설정

### 로컬 개발 환경
- **Next.js 개발 서버**: `localhost:3001` (포트 3000이 사용중일 때 자동 변경)
- **Prisma Studio**: `localhost:5556`

### Docker 환경 (docker-compose)
- **애플리케이션**: `localhost:3002` → 컨테이너 내부 `3000`
- **PostgreSQL**: `localhost:5434` → 컨테이너 내부 `5432`

### Railway 배포 환경
- **Railway 동적 포트**: Railway에서 자동으로 PORT 환경변수 할당
- **DATABASE_URL**: Railway에서 PostgreSQL 서비스 URL 자동 생성

## 개발 환경 시작 방법

### Docker 사용 (권장)
```bash
# 모든 서비스 시작
docker-compose up --build

# 백그라운드 실행
docker-compose up --build -d

# 서비스 중지
docker-compose down

# 완전 정리
docker-compose down --volumes --rmi all
```

### 로컬 개발
```bash
# 개발 서버 시작
npm run dev

# 데이터베이스 관리
npm run db:studio
```

## 배포 정보

### Railway 배포
- **플랫폼**: Railway
- **Docker**: 컨테이너 기반 배포
- **데이터베이스**: Railway PostgreSQL
- **환경변수**: Railway 대시보드에서 설정

### 필요한 환경변수
```
DATABASE_URL=postgresql://...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
DART_API_KEY=...
KOREA_INVESTMENT_APP_KEY=...
KOREA_INVESTMENT_APP_SECRET=...
```

## 주요 명령어

### 데이터베이스
```bash
npm run db:generate  # Prisma 클라이언트 생성
npm run db:migrate   # 마이그레이션 실행
npm run db:studio    # Prisma Studio 실행
```

### Docker
```bash
npm run docker:build  # Docker 이미지 빌드
npm run docker:up     # Docker 컨테이너 시작
npm run docker:down   # Docker 컨테이너 중지
```