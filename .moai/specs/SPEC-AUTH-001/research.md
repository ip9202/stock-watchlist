# Research: Email Authentication Implementation (NextAuth.js v5)

**Research Date**: 2026-05-19
**Complexity Score**: 7/10 (multi-domain, cross-cutting concerns)
**UltraThink Mode**: Activated (security-critical auth implementation)

---

## 1. Prisma Schema Analysis

**Current User Model** (`prisma/schema.prisma`):
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique                    // ✅ Ready for auth
  name      String?                            // ✅ Ready for auth  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  watchlists Watchlist[]  // ✅ One-to-many relationship
}
```

**Schema Compatibility**: ✅ **READY**
- User model has email field with unique constraint
- No additional schema changes needed for basic auth
- Password field (`hashedPassword`) would need to be added for credential auth

**Relations**: Only Watchlist model references User via `userId` field
**Cascade deletion**: `onDelete: Cascade` - when user is deleted, their watchlist items are automatically deleted

---

## 2. API Routes Using Hardcoded Demo User

### Primary API Routes requiring auth migration:

#### A. Watchlist API (`src/app/api/watchlist/route.ts`)
- **Lines 13-24, 64-75, 160-171**: Multiple hardcoded demo user lookups
- **Operations affected**: GET, POST, PUT

#### B. Individual Watchlist Item API (`src/app/api/watchlist/[id]/route.ts`)
- **Lines 20-31, 95-106**: Demo user lookups for delete operations
- **Operations affected**: DELETE (by id), DELETE (by symbol)

### Test Files requiring updates:
- `src/app/api/watchlist/__tests__/route.test.ts`
- `src/app/api/watchlist/[id]/__tests__/route.test.ts`

### Public APIs (NOT affected):
- `/api/stocks`, `/api/market`, `/api/disclosures`, `/api/signals`, `/api/health`

---

## 3. Next.js Configuration Analysis

**Next Config** (`next.config.ts`):
```typescript
{
  output: 'standalone',              // ✅ Compatible with NextAuth
  basePath: '/stocks',               // ⚠️ Affects auth redirect URLs
}
```

**Auth Implications**:
- **basePath**: All auth redirects will need to account for `/stocks` prefix
- **standalone output**: Good for production deployment

**Package Dependencies**:
- Current: `next: "15.5.2"`, `prisma: "^6.15.0"`
- Need to install: `next-auth@5`, `@auth/prisma-adapter`, `bcrypt` for password hashing

---

## 4. Middleware Analysis

**Current Status**: ❌ **NOT FOUND**
- No `middleware.ts` file exists in project root or `src` directory
- No existing route protection or redirects

**Required Components**:
- Session validation middleware
- Route protection for authenticated endpoints
- Redirect handling for login/logout flows

---

## 5. Client-side Data Fetching

**API Fetch Utility** (`src/lib/api.ts`):
- Currently includes no auth headers
- Requires modification to add authentication headers

**Components Using API Endpoints**:
- `WatchlistManager` (lines 31-44, 49-74, 80-95)
- Main page (`src/app/page.tsx` lines 15-24)

---

## 6. UI Components Analysis

**Layout** (`src/app/layout.tsx`):
- Basic layout with fonts and metadata
- Requires: auth provider, session state, navigation with login/logout

**Main Page** (`src/app/page.tsx`):
- Dashboard with search and watchlist management
- Requires: user greeting, login/logout button, conditional content

---

## 7. Database Setup

**Prisma Client** (`src/lib/db.ts`): ✅ Ready for auth integration

**Existing Migration** (`prisma/migrations/20250902042756_init/migration.sql`):
- User table has email unique constraint (good)
- No password field (needs to be added)
- No session table (NextAuth will handle)

**Environment Variables** (`.env.local`):
```typescript
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"  // Placeholder
DATABASE_URL="postgresql://ip9202@localhost:5432/stock_watchlist_dev"
```

---

## 8. Production Deployment

**PM2 Configuration** (`ecosystem.config.json`):
- Script: `start.sh`, env_file: `.env`, PORT: 3005
- Git-based deployment with PM2

**Auth Considerations for Production**:
- HTTPS requirements for session cookies
- Session storage configuration (database adapter)
- CSRF protection
- Secure cookie settings

---

## 9. Critical Files to Modify

### New Files to Create:
1. `src/lib/auth.ts` - NextAuth configuration
2. `src/app/api/auth/[...nextauth]/route.ts` - Auth API route
3. `src/components/auth/LoginForm.tsx` - Login component
4. `src/components/auth/SessionProvider.tsx` - Auth provider
5. `src/middleware.ts` - Route protection

### Files to Modify:
1. `src/app/layout.tsx` - Add auth provider
2. `src/app/page.tsx` - Add authentication state
3. `src/lib/api.ts` - Add auth headers
4. `prisma/schema.prisma` - Add password field
5. `src/app/api/watchlist/route.ts` - Replace hardcoded user
6. `src/app/api/watchlist/[id]/route.ts` - Replace hardcoded user
7. `src/components/dashboard/WatchlistManager.tsx` - Handle auth state

### Database Migration Needed:
```sql
ALTER TABLE "public"."users" ADD COLUMN "hashedPassword" TEXT;
```

---

## 10. Authentication Flow Integration Points

**Current State**:
- No user authentication state management
- Hardcoded `demo@example.com` used everywhere
- No session or token handling

**Required Integration**:
1. Session Management: Replace all `demo@example.com` lookups
2. API Security: Add authentication middleware
3. UI State: Add login/logout functionality
4. Error Handling: Handle authentication errors
5. Route Protection: Prevent unauthorized access

---

## 11. Migration Strategy

**Phase 1**: Add NextAuth infrastructure (auth config, API route, middleware)
**Phase 2**: Replace hardcoded users with session users
**Phase 3**: Update UI components for authentication
**Phase 4**: Remove demo user dependency, create admin account

---

## 12. User Preferences

**Selected Options from Interview**:
- **Auth Library**: NextAuth.js v5 Credentials (email/password)
- **Signup Policy**: Public signup (anyone can register)
- **Data Migration**: Migrate to admin account (admin@example.com)

**Implementation Notes**:
- Use bcrypt for password hashing
- Create admin@example.com account with existing demo watchlist
- Public signup means no invite code system needed
