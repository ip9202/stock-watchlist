#!/bin/bash

# 🚀 Docker Container Startup Script

echo "🔍 Container startup 시작..."

# 환경변수 확인
echo "📊 Environment:"
echo "   NODE_ENV: $NODE_ENV"
echo "   PYTHONPATH: $PYTHONPATH"
echo "   DATABASE_URL: ${DATABASE_URL:0:30}..."

# Python 환경 확인
echo "🐍 Python 환경 확인..."
python3 --version
python3 -c "import pykrx; print('✅ PyKRX 사용 가능')" || echo "❌ PyKRX 오류"
python3 -c "import yfinance; print('✅ yfinance 사용 가능')" || echo "❌ yfinance 오류"

# 데이터베이스 연결 대기 및 스키마 푸시 (개발용)
echo "🔄 데이터베이스 연결 및 스키마 설정 중..."
npx prisma db push --accept-data-loss || {
    echo "❌ 데이터베이스 연결 실패"
    exit 1
}

# 데모 사용자 시드 데이터 생성
echo "🌱 데모 사용자 생성 중..."
node scripts/seed-demo-user.js || {
    echo "❌ 시드 데이터 생성 실패"
    exit 1
}

# 주식 데이터 캐시 미리 생성 (첫 API 호출 속도 향상)
echo "📊 주식 데이터 캐시 생성 중..."
timeout 180s python3 scripts/fetch_all_stocks.py --search "삼성" --limit 1 --cache /app/all_stocks_cache.json || {
    echo "⚠️ 캐시 생성 실패 또는 타임아웃 (API에서 재시도됩니다)"
}

# 애플리케이션 시작
echo "🚀 Stock Watchlist 애플리케이션 시작..."
exec npm start