#!/bin/bash
# PM2 start script for stock-watchlist
# Loads .env file and starts Next.js standalone server

# Change to script directory
cd "$(dirname "$0")"

# Load .env file if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Start Next.js standalone server
NODE_ENV=production PORT=3005 node .next/standalone/server.js
