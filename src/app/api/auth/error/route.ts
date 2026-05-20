/**
 * NextAuth 에러 페이지 (SPEC-AUTH-001)
 *
 * - 인증 실패 시 표시할 에러 메시지
 * - /api/auth/error로 리다이렉트됨
 */

import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // request.url에서 origin 추출하여 절대 URL 구성 (상대 경로는 프로덕션에서 미동작)
  const url = new URL(request.url)
  const loginUrl = new URL('/stocks/login', url.origin)
  loginUrl.searchParams.set('error', 'credentials')
  return NextResponse.redirect(loginUrl)
}
