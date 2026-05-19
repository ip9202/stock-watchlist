/**
 * 라우트 보호 미들웨어 (SPEC-AUTH-001, SPEC-AUTH-002)
 *
 * - /stocks/login, /stocks/signup 제외한 /stocks/* 라우트 보호
 * - /api/auth/* 제외 (단, /api/auth/callback/credentials는 Rate Limit 적용)
 * - 미인증 사용자 → /stocks/login 리다이렉트
 * - 인증된 사용자가 /login 접근 → /stocks 리다이렉트
 * - POST /api/auth/callback/credentials → 5회/5분 Rate Limit
 */

import { auth } from '@/lib/auth'
import { checkRateLimit, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// @MX:ANCHOR: [AUTO] 라우트 보호 미들웨어 - 모든 /stocks/* 요청의 인증 게이트
// @MX:REASON: 인증 흐름의 핵심 제어 포인트, 모든 보호 라우트가 통과
export default auth(async function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  const session = (req as NextRequest & { auth: { user?: { id: string } } | null }).auth

  // Rate Limit: POST /api/auth/callback/credentials
  // @MX:NOTE: [AUTO] 로그인 Rate Limit - 무차별 대입 공격 방지
  if (req.method === 'POST' && pathname === '/api/auth/callback/credentials') {
    // IP 추출
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // Email 추출 (req.clone() 사용으로 body 소비 방지)
    let email = 'unknown'
    try {
      const clonedReq = req.clone()
      const body = await clonedReq.json()
      email = body?.credentials?.email || 'unknown'
    } catch {
      // JSON 파싱 실패 시 기본값 사용
    }

    const rateLimitKey = `${ip}:${email}`
    const result = checkRateLimit(rateLimitKey, {
      maxAttempts: LOGIN_MAX_ATTEMPTS,
      windowSeconds: LOGIN_WINDOW
    })

    if (!result.allowed) {
      return NextResponse.json(
        { error: '너무 많은 로그인 시도입니다. 나중에 다시 시도해주세요.' },
        {
          status: 429,
          headers: {
            'Retry-After': result.retryAfter?.toString() || '300',
            'X-RateLimit-Limit': LOGIN_MAX_ATTEMPTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (result.retryAfter || 300) * 1000).toISOString()
          }
        }
      )
    }
  }

  // 공개 경로 (인증 불필요)
  const publicPaths = ['/login', '/signup']
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  // 인증된 사용자가 로그인 페이지에 접근 → 홈으로 리다이렉트
  if (session && isPublicPath) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 미인증 사용자가 보호 경로에 접근 → 로그인으로 리다이렉트
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

// @MX:NOTE: [AUTO] matcher 설정 - basePath /stocks는 Next.js가 자동 처리
// api/auth/callback/credentials는 Rate Limit를 위해 미들웨어 통과 필요
export const config = {
  matcher: [
    /*
     * 다음 경로로 시작하는 요청 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - 이미지 파일
     *
     * 주의: api/auth를 제외 목록에서 제거하여 /api/auth/callback/credentials가 미들웨어를 통과하도록 함
     * 다른 /api/auth/* 경로는 auth() 함수가 내부적으로 처리
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
