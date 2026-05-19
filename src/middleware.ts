/**
 * 라우트 보호 미들웨어 (SPEC-AUTH-001)
 *
 * - /stocks/login, /stocks/signup 제외한 /stocks/* 라우트 보호
 * - /api/auth/* 제외
 * - 미인증 사용자 → /stocks/login 리다이렉트
 * - 인증된 사용자가 /login 접근 → /stocks 리다이렉트
 */

import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// @MX:ANCHOR: [AUTO] 라우트 보호 미들웨어 - 모든 /stocks/* 요청의 인증 게이트
// @MX:REASON: 인증 흐름의 핵심 제어 포인트, 모든 보호 라우트가 통과
export default auth(function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  const session = (req as NextRequest & { auth: { user?: { id: string } } | null }).auth

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
// api/auth 경로는 NextAuth 자체가 처리하므로 미들웨어 제외
export const config = {
  matcher: [
    /*
     * 다음 경로로 시작하는 요청 제외:
     * - api/auth (NextAuth 라우트)
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - 이미지 파일
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
