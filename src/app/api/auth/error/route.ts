/**
 * NextAuth 에러 페이지 (SPEC-AUTH-001)
 *
 * - 인증 실패 시 표시할 에러 메시지
 * - /api/auth/error로 리다이렉트됨
 */

import { NextResponse, type NextRequest } from 'next/server'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  // Nginx 리버스 프록시 환경에서 request.url origin이 0.0.0.0:3005(내부 주소)로 잡힘
  // AUTH_URL 환경변수(https://ip9202.site)를 사용하여 정확한 퍼블릭 URL 구성
  const origin = process.env.AUTH_URL ?? 'https://ip9202.site'
  const loginUrl = new URL('/stocks/login', origin)
  loginUrl.searchParams.set('error', 'credentials')
  return NextResponse.redirect(loginUrl)
}
