#!/bin/bash
# PM2 start script for stock-watchlist
# Loads .env file and starts Next.js standalone server

# Change to script directory
cd "$(dirname "$0")"

# Load .env file if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Next.js standalone: static 파일 동기화 (빌드 후 누락 방지)
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true

# Start Next.js standalone server
NODE_ENV=production PORT=3005 node .next/standalone/server.js
