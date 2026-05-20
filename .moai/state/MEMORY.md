# Stock Watchlist - Project Memory

## Project Overview

**Type**: Full-stack Web Application
**Purpose**: Korean stock market watchlist management dashboard
**Stack**: Next.js 15.5.2, React 19, PostgreSQL, Prisma, Tailwind CSS

## Development Methodology

**Current Mode**: DDD (Domain-Driven Development)
- **Reason**: Test coverage < 10%
- **Config File**: `.moai/config/sections/quality.yaml`
- **Settings**: ANALYZE-PRESERVE-IMPROVE cycle

## Data Sources

### Primary: PyKRX 1.2.4
- **Status**: ✅ Working
- **Purpose**: KRX official stock data (free)
- **Scripts**:
  - `scripts/fetch_stock_data.py` - Stock data fetching
  - `scripts/fetch_all_stocks.py` - Stock search
  - Cache file: `/app/all_stocks_cache.json`

### Secondary: Kiwoom OpenAPI (Pending)
- **Status**: ⏳ Authentication failed (error 8001)
- **Issue**: API approval pending
- **Scripts Prepared**:
  - `scripts/fetch_stock_data_kiwoom.py`
  - `scripts/fetch_all_stocks_kiwoom.py`
- **API Keys**:
  - App Key: `1YpkhIyNB9iHMEDuAbX71DTZDbaXzl20yrYPjFXUc9s`
  - Stored in: `scripts/keys/`

## Architecture

```
Frontend (React 19)
    ↓
Next.js API Routes
    ↓
Python Scripts (PyKRX/Kiwoom)
    ↓
PostgreSQL + Prisma
```

## Key Files

| Path | Purpose |
|------|---------|
| `src/app/api/stocks/[symbol]/route.ts` | Stock data API |
| `src/app/api/stocks/route.ts` | Stock search API |
| `src/lib/python-executor.ts` | Python script executor |
| `src/lib/cache.ts` | Response caching (30s TTL) |
| `scripts/fetch_stock_data.py` | PyKRX data fetcher |
| `scripts/fetch_all_stocks.py` | PyKRX stock searcher |
| `prisma/schema.prisma` | Database schema |

## Database Models

- `User` - User accounts
- `Watchlist` - User's stock watchlist
- `StockPrice` - Historical stock prices
- `News` - Stock news articles
- `Disclosure` - Company disclosures

## Development Environment

- **Node.js**: 18 LTS
- **Python**: 3.12
- **Database**: PostgreSQL 15
- **ORM**: Prisma 6.15.0
- **Container**: Docker

## Deployment

- **Platform**: Railway
- **Build**: Docker multi-stage
- **Database**: Railway PostgreSQL
- **URL**: https://stock-watchlist-production.up.railway.app

## Known Issues

1. **PyKRX Python 3.12 Compatibility**
   - Fixed by upgrading to 1.2.4
   - Added setuptools for pkg_resources

2. **Kiwoom API Authentication**
   - Error: "인증에 실패했습니다[8001]"
   - Action: Verify API approval status

## Session History

- **2026-02-26**: Initial MoAI setup, Kiwoom API integration attempted, PyKRX upgraded

## Next Actions

### Immediate
1. Verify Kiwoom API approval status
2. Test all API endpoints
3. Run database migrations if needed

### Future
1. Implement user authentication
2. Add real-time WebSocket data
3. Portfolio analytics features
