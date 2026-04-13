#!/bin/bash

# Stock Watchlist 서버 시작 래퍼
# standalone server.js는 .env 자동 로드하지 않으므로 래퍼 필요
# git 기반 배포: 서버에서 빌드 후 standalone 경로에서 실행

cd /Users/irons_server/projects/stock-watchlist
set -a
source .env
set +a
exec node .next/standalone/server.js
