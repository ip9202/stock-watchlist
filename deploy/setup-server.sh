#!/bin/bash

# ============================================
# Stock Watchlist Server Setup Script
# ============================================
# 최초 서버 셋업: git clone, npm install, .env, PM2 설정
#
# 사전 조건:
#   1. SSH 키 인증 설정 (아래 가이드 참고)
#   2. 서버에 Node.js 18+ 설치
#   3. 서버에 git 설치
#
# Usage:
#   ./deploy/setup-server.sh
# ============================================

set -e

SERVER="irons_server@ip9202.site"
PROJECT_PATH="~/projects/stock-watchlist"
PM2_NAME="stock-watchlist"
REPO_URL="https://github.com/ip9202/stock-watchlist.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# SSH 래퍼 (macOS 로그인 셸로 PATH 로드)
run_on_server() {
  ssh "$SERVER" "bash -l -c '$1'"
}

echo ""
echo "=========================================="
echo "  Stock Watchlist Server Setup"
echo "  Target: $SERVER"
echo "=========================================="
echo ""

# ============================================
# Step 0: SSH 키 인증 설정 가이드
# ============================================

log_info "Step 0: SSH 키 인증 확인..."

# SSH 키 인증 테스트
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" "echo ok" > /dev/null 2>&1; then
  log_success "SSH 키 인증 이미 설정됨"
else
  log_warn "SSH 키 인증이 설정되지 않았습니다."
  echo ""
  echo "다음 명령으로 설정하세요:"
  echo "  ssh-keygen -t ed25519"
  echo "  ssh-copy-id $SERVER"
  echo ""
  echo "등록 후 이 스크립트를 다시 실행하세요."
  exit 1
fi

# 서버 환경 확인
log_info "서버 환경 확인..."
run_on_server "echo '  Node: '\$(node --version) && echo '  npm: '\$(npm --version) && echo '  git: '\$(git --version)"
log_success "서버 환경 확인 완료"

# ============================================
# Step 1: Git clone
# ============================================

log_info "Step 1: Git clone..."

if ssh "$SERVER" "[ -d $PROJECT_PATH/.git ]"; then
  log_warn "이미 git 저장소가 존재합니다: $PROJECT_PATH"
  log_info "git pull로 업데이트합니다..."
  run_on_server "cd $PROJECT_PATH && git pull origin main"
else
  ssh "$SERVER" "mkdir -p ~/projects"
  ssh "$SERVER" "cd ~/projects && git clone $REPO_URL stock-watchlist"
fi
log_success "Git 저장소 준비 완료"

# ============================================
# Step 2: .env 파일 설정
# ============================================

log_info "Step 2: .env 파일 확인..."

if ssh "$SERVER" "[ -f $PROJECT_PATH/.env ]"; then
  log_success ".env 파일이 이미 존재합니다"
else
  log_warn ".env 파일이 없습니다!"
  echo ""
  echo "서버에 .env 파일을 수동으로 생성해야 합니다:"
  echo ""
  echo "  ssh $SERVER"
  echo "  nano $PROJECT_PATH/.env"
  echo ""
  echo "필요한 환경변수:"
  echo "  KIWOOM_APP_KEY=..."
  echo "  KIWOOM_SECRET_KEY=..."
  echo "  NAVER_CLIENT_ID=..."
  echo "  NAVER_CLIENT_SECRET=..."
  echo "  DART_API_KEY=..."
  echo "  DATABASE_URL=postgresql://..."
  echo ""
  echo ".env 설정 후 이 스크립트를 다시 실행하세요."
  exit 1
fi

# ============================================
# Step 3: npm install
# ============================================

log_info "Step 3: npm install..."
run_on_server "cd $PROJECT_PATH && npm ci"
log_success "Dependencies installed"

# ============================================
# Step 4: Prisma generate
# ============================================

log_info "Step 4: Prisma generate..."
run_on_server "cd $PROJECT_PATH && ./node_modules/.bin/prisma generate --schema prisma/schema.prisma"
log_success "Prisma client generated"

# ============================================
# Step 5: DB migration
# ============================================

log_info "Step 5: DB migration..."
run_on_server "cd $PROJECT_PATH && ./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma"
log_success "Database migration completed"

# ============================================
# Step 6: Build
# ============================================

log_info "Step 6: Building Next.js application..."
run_on_server "cd $PROJECT_PATH && npm run build:prod"
log_success "Build completed"

# ============================================
# Step 7: Post-build (standalone 설정)
# ============================================

log_info "Step 7: Post-build setup (static + public 복사)..."
run_on_server "cd $PROJECT_PATH && \
  cp -r .next/static .next/standalone/.next/static && \
  cp -r public .next/standalone/public 2>/dev/null || true && \
  cp deploy/start.sh . && \
  cp deploy/ecosystem.config.json . && \
  chmod +x start.sh"
log_success "Post-build setup completed"

# ============================================
# Step 8: PM2 시작
# ============================================

log_info "Step 8: PM2 시작..."
run_on_server "cd $PROJECT_PATH && pm2 start ecosystem.config.json && pm2 save"
log_success "PM2 started"

# ============================================
# Step 9: 로그 확인
# ============================================

log_info "Step 9: 로그 확인..."
run_on_server "pm2 logs $PM2_NAME --lines 15 --nostream"

echo ""
echo "=========================================="
log_success "Server Setup Complete!"
echo "=========================================="
echo ""
echo "Access URL: https://ip9202.site/stocks"
echo ""
echo "이후 배포는 다음 명령으로:"
echo "  ./deploy/deploy.sh          # 일반 배포"
echo "  ./deploy/deploy.sh --db     # DB 마이그레이션 포함"
echo ""
