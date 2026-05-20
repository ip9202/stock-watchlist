# Codebase Quality Research Report
**Date**: 2026-02-28
**Researcher**: team-researcher
**Project**: stock-watchlist

---

## Executive Summary

This report summarizes the codebase quality analysis of the stock-watchlist project. The project is a Next.js application for tracking Korean stock market data with Python-based data collection scripts.

**Overall Health Score**: 6.5/10

**Critical Issues Found**: 3
**High Priority Issues**: 5
**Medium Priority Issues**: 7
**Low Priority Issues**: 4

---

## 1. Code Structure Analysis

### Project Architecture
```
src/
├── app/
│   ├── api/              # API Routes (11 files)
│   ├── stock/            # Stock detail pages
│   └── page.tsx          # Main dashboard
├── components/
│   ├── ui/               # Base UI components (6 files)
│   ├── dashboard/        # Dashboard components (4 files)
│   └── layout/           # Layout components
├── lib/
│   ├── db.ts             # Prisma client
│   ├── python-executor.ts # Python script execution
│   ├── cache.ts          # Simple in-memory cache
│   ├── constants.ts      # Constants
│   └── utils.ts          # Utilities
├── types/
│   ├── api.ts            # API types
│   └── stock.ts          # Stock types
└── app/

scripts/                  # Python data collection (13 files)
prisma/                   # Database schema & migrations
```

### Positive Findings
- Clean separation of concerns (UI, API, types, utilities)
- TypeScript used throughout
- Prisma ORM for database operations
- Docker multi-stage build configuration

### Structural Issues
- No dedicated error handling utilities
- Cache implementation is basic (no TTL cleanup)
- Mixed API response patterns

---

## 2. Code Quality Issues

### 2.1 TODO Comments (5 occurrences)

**Location**: `src/app/api/watchlist/route.ts`, `src/app/api/watchlist/[id]/route.ts`

**Pattern**: All 5 TODOs are identical:
```typescript
// TODO: 실제 사용자 인증 구현 후 userId 가져오기
// 임시로 demo 사용자 사용
const demoUser = await db.user.findUnique({
  where: { email: 'demo@example.com' }
})
```

**Impact**: HIGH - Security vulnerability, no real authentication

**Files**:
- `src/app/api/watchlist/route.ts:10, 61, 147`
- `src/app/api/watchlist/[id]/route.ts:17, 86`

### 2.2 Debug Console Logs (10+ occurrences)

**Frontend Components**:
- `src/components/dashboard/StockSearch.tsx:39,42,46` - Debug logs for API responses
- `src/components/dashboard/WatchlistManager.tsx:36,39,66,70,89,92` - Error logs
- `src/components/dashboard/StockCard.tsx:54` - Error log
- `src/components/dashboard/DisclosureList.tsx:85` - Error log
- `src/app/page.tsx:30-31` - Handled situation log

**Backend**:
- `src/lib/python-executor.ts:46,53,58` - Environment detection logs
- `src/app/api/stocks/route.ts:101-103` - Process exit logs

**Impact**: LOW - Performance impact, information leakage in production

### 2.3 Code Duplication

**Pattern**: Demo user lookup repeated 5 times across watchlist APIs:
```typescript
const demoUser = await db.user.findUnique({
  where: { email: 'demo@example.com' }
})

if (!demoUser) {
  return NextResponse.json<ApiResponse>({
    success: false,
    error: 'Demo user not found'
  }, { status: 500 })
}

const userId = demoUser.id
```

**Impact**: MEDIUM - Maintenance burden, should extract to middleware

---

## 3. Security Assessment

### 3.1 CRITICAL: Hardcoded Demo User

**Location**: All watchlist API routes

**Issue**: No actual authentication, hardcoded demo user lookup

**Recommendation**: Implement proper authentication (NextAuth.js, Clerk, or custom JWT)

### 3.2 HIGH: Potential Secret Files in Repository

**Location**: `scripts/keys/appkey.txt`, `scripts/keys/secretkey.txt`

**Issue**: API key files exist in repository directory

**Verification Required**:
```bash
git status scripts/keys/
git log --follow scripts/keys/
```

**Recommendation**:
1. Remove files if committed to git history
2. Add to `.gitignore` (already patterns exist: `*-key.*`, `*_secret.*`)
3. Use environment variables only

### 3.3 MEDIUM: Environment Variable Validation

**Location**: `src/lib/python-executor.ts:101-106`

**Issue**: No validation that required environment variables exist before use:
```typescript
NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET,
DART_API_KEY: process.env.DART_API_KEY,
KIWOOM_APP_KEY: process.env.KIWOOM_APP_KEY,
KIWOOM_SECRET_KEY: process.env.KIWOOM_SECRET_KEY,
```

**Recommendation**: Add validation at startup:
```typescript
const requiredEnvVars = [
  'NAVER_CLIENT_ID',
  'NAVER_CLIENT_SECRET',
  'DART_API_KEY',
  'KIWOOM_APP_KEY',
  'KIWOOM_SECRET_KEY'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
```

### 3.4 Input Validation

**Status**: GOOD - Basic validation exists in API routes

**Examples**:
- `src/app/api/watchlist/route.ts:54-58` - Symbol/name validation
- `src/app/api/stocks/route.ts:14-18` - Query parameter validation

### 3.5 SQL Injection / XSS

**Status**: LOW RISK - Prisma ORM prevents SQL injection
- React component rendering escapes by default
- No raw SQL queries found

---

## 4. Testing Coverage

### Current State: CRITICALLY LOW

**Test Files Found**: 2
- `src/lib/python-executor.ts` - Contains `describe` references
- `src/app/api/disclosures/route.ts` - Contains `describe` references

**Actual Test Coverage**: ~0%
- No `*.test.ts` or `*.spec.ts` files in src/
- No test configuration files (vitest.config.ts, jest.config.js)
- No test scripts in package.json (except possibly through dependencies)

**Critical Areas Without Tests**:
1. All API routes (`src/app/api/**/*.ts`)
2. All React components (`src/components/**/*.tsx`)
3. Database operations (`src/lib/db.ts`)
4. Cache implementation (`src/lib/cache.ts`)
5. Python script execution (`src/lib/python-executor.ts`)

**Recommendation**: Implement testing infrastructure with Vitest + React Testing Library

---

## 5. Performance Issues

### 5.1 Inefficient Database Queries

**Location**: `src/app/api/watchlist/route.ts:94-101`

**Issue**: Separate aggregation query for order:
```typescript
const maxOrder = await db.watchlist.aggregate({
  where: { userId: userId },
  _max: { order: true }
})
```

**Impact**: LOW - Only on add operation, acceptable for now

### 5.2 Python Process Spawning

**Location**: `src/app/api/stocks/route.ts:77-87`

**Issue**: Spawns bash process for each stock data request:
```typescript
const pythonProcess = spawn('bash', ['-c', command], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ... }
})
```

**Impact**: MEDIUM - Process overhead, no connection pooling

**Mitigation**: 30-second cache reduces frequency

### 5.3 Missing Cache Cleanup

**Location**: `src/lib/cache.ts`

**Issue**: In-memory cache without TTL cleanup mechanism

**Impact**: MEDIUM - Memory leak potential in long-running processes

---

## 6. Documentation Gaps

### 6.1 Code Comments

**Status**: ADEQUATE for Korean project

**Well-Documented**:
- `src/lib/python-executor.ts:1-4` - Clear purpose statement
- `README.md` - Comprehensive setup instructions

**Needs Documentation**:
- `src/lib/cache.ts` - No JSDoc comments
- `src/lib/constants.ts` - No explanations for values
- API route files - Missing endpoint descriptions

### 6.2 API Documentation

**Status**: GOOD - README has API examples

**Missing**:
- OpenAPI/Swagger specification
- Request/response type documentation separate from code

---

## 7. Error Handling Assessment

### 7.1 Frontend Error Handling

**Status**: GOOD - Try-catch blocks in async functions

**Pattern**:
```typescript
try {
  const response = await fetch('/api/watchlist')
  const data = await response.json()
  if (data.success) {
    setWatchlist(data.data || [])
  } else {
    console.error('Failed to fetch watchlist:', data.error)
  }
} catch (error) {
  console.error('Error fetching watchlist:', error)
}
```

**Issue**: Errors only logged to console, no user feedback

### 7.2 Backend Error Handling

**Status**: GOOD - Consistent error response format

**Pattern**:
```typescript
catch (error) {
  console.error('Watchlist GET error:', error)
  return NextResponse.json<ApiResponse>({
    success: false,
    error: 'Internal server error'
  }, { status: 500 })
}
```

**Issue**: Generic error messages may leak sensitive information in console.error

---

## 8. Deployment & DevOps

### 8.1 Docker Configuration

**Status**: EXCELLENT - Multi-stage build with health checks

**Strengths**:
- Python + Node.js combined image
- Health check endpoint
- Proper environment variable handling
- Non-root user could be added (missing)

### 8.2 Environment Configuration

**Status**: GOOD

**Files**: `.env`, `.env.local`, `.env.example`

**Issue**: No environment variable validation at startup

---

## 9. Dependency Health

### 9.1 Package.json Analysis

**Key Dependencies**:
- Next.js 15.5.2
- React 19
- Prisma 6.15.0
- Tailwind CSS v4

**Status**: Current versions, no outdated major dependencies detected

---

## 10. Recommendations Priority Matrix

### CRITICAL (Fix Immediately)
1. **Implement Authentication** - Remove hardcoded demo user
2. **Verify Secret Files** - Check if `scripts/keys/*` committed to git
3. **Add Basic Tests** - At least test critical API routes

### HIGH (This Sprint)
4. **Remove Debug Console Logs** - Replace with proper logging
5. **Add Environment Variable Validation** - Fail fast on missing keys
6. **Extract Demo User Pattern** - Create authentication middleware
7. **Add User Feedback for Errors** - Show toasts/error messages in UI

### MEDIUM (Next Sprint)
8. **Implement Test Infrastructure** - Vitest + React Testing Library
9. **Add Cache Cleanup** - Implement TTL-based cleanup
10. **Add JSDoc Comments** - Document utility functions
11. **Create API Specification** - OpenAPI/Swagger docs

### LOW (Backlog)
12. **Optimize Database Queries** - Consider batch operations
13. **Python Connection Pooling** - Long-term optimization
14. **Add Logging Framework** - Replace console.log with structured logging

---

## 11. File-Specific Issues Summary

| File | Issues | Priority |
|------|--------|----------|
| `src/app/api/watchlist/route.ts` | 3 TODOs, code duplication | CRITICAL |
| `src/app/api/watchlist/[id]/route.ts` | 2 TODOs, code duplication | CRITICAL |
| `src/components/dashboard/StockSearch.tsx` | 3 debug logs | LOW |
| `src/lib/python-executor.ts` | No env validation, 3 logs | HIGH |
| `scripts/keys/*` | Potential secret files | CRITICAL |
| `src/lib/cache.ts` | No TTL cleanup | MEDIUM |

---

## Conclusion

The stock-watchlist project has a solid foundation with good architecture choices (Next.js, Prisma, Docker). However, it lacks critical security features (authentication) and has minimal test coverage. The most urgent priority is implementing proper authentication before any production use.

**Next Steps**:
1. Verify and remediate secret files issue
2. Implement authentication system
3. Add basic test coverage for critical paths
4. Remove debug logging from production code
