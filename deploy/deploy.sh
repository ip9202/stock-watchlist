#!/bin/bash

# ============================================
# Stock Watchlist Git-based Deployment Script
# ============================================
# SCP 방식 대신 git pull + 서버 빌드 방식
# SSH 키 인증 필수 (setup-server.sh 참고)
#
# Usage:
#   ./deploy/deploy.sh          # 일반 배포
#   ./deploy/deploy.sh --db     # DB 마이그레이션 포함
# ============================================

set -e

# Configuration
SERVER="irons_server@ip9202.site"
PROJECT_PATH="~/projects/stock-watchlist"
PM2_NAME="stock-watchlist"
SERVICE_URL="https://ip9202.site/stocks"

# Flags
DB_MIGRATE=false

for arg in "$@"; do
  case $arg in
    --db) DB_MIGRATE=true ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Change to project root
cd "$(dirname "$0")/.." || exit 1

# 사전 검증: SSH 키 인증 확인
log_info "SSH 연결 확인 중..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" "echo ok" > /dev/null 2>&1; then
  log_error "SSH 키 인증이 설정되어 있지 않습니다."
  echo ""
  echo "다음 명령으로 SSH 키를 설정하세요:"
  echo "  ssh-copy-id $SERVER"
  echo ""
  echo "SSH 키가 없으면 먼저 생성하세요:"
  echo "  ssh-keygen -t ed25519"
  echo ""
  exit 1
fi
log_success "SSH 연결 확인 완료"

echo ""
echo "=========================================="
echo "  Stock Watchlist Git Deployment"
echo "  Target: $SERVICE_URL"
echo "  Mode: STANDARD$([ "$DB_MIGRATE" = true ] && echo ' + DB MIGRATE' || echo '')"
echo "=========================================="
echo ""

# Step 1: Push to remote
log_info "Step 1: Pushing to remote..."
BRANCH=$(git branch --show-current)
git push origin "$BRANCH"
log_success "Pushed to origin/$BRANCH"

# SSH 래퍼 (macOS 로그인 셸로 PATH 로드)
run_on_server() {
  ssh "$SERVER" "bash -l -c '$1'"
}

# Step 2: Pull on server
log_info "Step 2: Pulling latest code on server..."
run_on_server "cd $PROJECT_PATH && git pull origin $BRANCH"
log_success "Server updated"

# Step 3: Install dependencies (package.json 변경시)
log_info "Step 3: Checking dependencies..."
run_on_server "cd $PROJECT_PATH && bash -c 'git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -qE \"(package.json|package-lock.json)\" && npm ci || echo \"  No dependency changes, skipping npm ci\"'"
log_success "Dependencies checked"

# Step 4: DB migration (--db only)
if [ "$DB_MIGRATE" = true ]; then
  log_info "Step 4: Running Prisma migrate deploy..."
  run_on_server "cd $PROJECT_PATH && ./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma"
  log_success "Database migration completed"
else
  log_info "Step 4: Skipping DB migration (use --db to include)"
fi

# Step 5: Build on server
log_info "Step 5: Building on server..."
run_on_server "cd $PROJECT_PATH && npm run build:prod"
log_success "Build completed"

# Step 6: Post-build (standalone용 static/public 복사)
log_info "Step 6: Post-build setup..."
run_on_server "cd $PROJECT_PATH && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public 2>/dev/null || true"
log_success "Post-build setup completed"

# Step 7: Restart PM2
log_info "Step 7: Restarting PM2..."
run_on_server "pm2 restart $PM2_NAME || pm2 start $PROJECT_PATH/ecosystem.config.json"
log_success "PM2 restarted"

# Step 8: Check logs
log_info "Step 8: Checking logs..."
run_on_server "pm2 logs $PM2_NAME --lines 10 --nostream"

echo ""
echo "=========================================="
log_success "Deployment Complete!"
echo "=========================================="
echo ""
echo "Access URL: $SERVICE_URL"
echo "PM2 Name:   $PM2_NAME"
echo "Branch:     $BRANCH"
echo ""
echo "Rollback:   ./deploy/deploy.sh rollback"
echo "            (또는: ssh $SERVER \"bash -l -c 'cd $PROJECT_PATH && git checkout HEAD~1 && npm run build:prod && pm2 restart $PM2_NAME'\")"
echo ""
