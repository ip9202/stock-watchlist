# Stock Watchlist 배포 가이드

## 배포 정보

| 항목 | 값 |
|------|------|
| URL | https://ip9202.site/stocks |
| Port | 3005 |
| PM2 Name | stock-watchlist |
| Server Path | ~/projects/stock-watchlist |
| 방식 | Next.js standalone + PM2 + Nginx |

## 서버 초기 설정 (1회성)

### 1. 디렉토리 생성

```bash
mkdir -p ~/projects/stock-watchlist/{scripts,prisma}
```

### 2. PostgreSQL DB 생성

```bash
createdb stock_watchlist_prod
```

### 3. Python 패키지 설치

```bash
pip3 install requests python-dotenv
```

### 4. Prisma CLI 설치

```bash
npm install -g prisma
```

### 5. .env 파일 생성

```bash
cat > ~/projects/stock-watchlist/.env << 'EOF'
# Server
PORT=3005
HOSTNAME=0.0.0.0
NODE_ENV=production

# Database
DATABASE_URL="postgresql://irons_server@localhost:5432/stock_watchlist_prod"

# Kiwoom API
KIWOOM_APP_KEY=your_app_key
KIWOOM_SECRET_KEY=your_secret_key

# Naver News API
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# DART API
DART_API_KEY=your_dart_api_key

# Python (서버 기본 python3 사용 시 생략 가능)
# PYTHON_PATH=/usr/bin/python3
EOF
```

실제 API 키로 값을 교체한다.

### 6. 첫 배포

```bash
# 로컬에서 실행
./deploy/deploy.sh --full --db
```

### 7. 시드 데이터 (선택)

```bash
# 서버에서 실행
cd ~/projects/stock-watchlist
node scripts/seed-demo-user.js
```

### 8. PM2 등록

```bash
# 서버에서 실행
cd ~/projects/stock-watchlist
pm2 start ecosystem.config.json
pm2 save
```

### 9. Nginx 설정

`/opt/homebrew/etc/nginx/nginx.conf`의 `server {}` 블록에 `deploy/nginx-stocks.conf` 내용을 추가한다.

```bash
# 서버에서 실행
sudo nginx -t && sudo nginx -s reload
```

### 10. 루트 index.html (선택)

ip9202.site 메인 페이지에 stock-watchlist 링크를 추가한다.

## 일반 배포 (코드 변경)

```bash
./deploy/deploy.sh
```

빌드 → .next + server.js + scripts + prisma 배포 → PM2 재시작

## 전체 배포 (의존성 변경)

```bash
./deploy/deploy.sh --full
```

node_modules까지 전체 배포

## DB 마이그레이션 포함

```bash
./deploy/deploy.sh --db
./deploy/deploy.sh --full --db
```

## 검증

```bash
# Health check (API 라우트가 있는 경우)
curl https://ip9202.site/stocks/api/stocks?q=삼성

# 프론트엔드
open https://ip9202.site/stocks
```

## 트러블슈팅

### PM2 로그 확인

```bash
ssh irons_server@ip9202.site
pm2 logs stock-watchlist --lines 50
```

### PM2 재시작

```bash
pm2 restart stock-watchlist
```

### Prisma Client 누락 시

`next.config.ts`에 추가:

```typescript
serverExternalPackages: ['@prisma/client'],
```

### Python 스크립트 오류

PM2 cwd가 프로젝트 루트인지 확인 (`executeScript('scripts/...')`는 CWD 기준 상대경로).
