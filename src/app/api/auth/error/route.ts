/**
 * NextAuth 에러 페이지 (SPEC-AUTH-001)
 *
 * - 인증 실패 시 표시할 에러 메시지
 * - /api/auth/error로 리다이렉트됨
 */

import { NextResponse } from 'next/server'

export async function GET() {
  // 로그인 페이지로 리다이렉트하면서 에러 쿼리 파라미터 전달
  return NextResponse.redirect('/stocks/login?error=credentials')
}
