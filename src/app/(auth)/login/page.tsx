/**
 * 로그인 페이지 (SPEC-AUTH-001)
 *
 * - 미들웨어가 이미 인증된 사용자를 홈으로 리다이렉트
 * - 서버 컴포넌트에서 추가 세션 체크 (중복 방지)
 */
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Stock Watchlist - 로그인',
  description: '이메일과 비밀번호로 로그인하세요',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error

  // 이미 로그인된 사용자는 홈으로
  const session = await auth()
  if (session) {
    redirect('/')
  }

  return (
    <>
      <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-gray-900">
        로그인
      </h2>
      <LoginForm initialError={error} />
    </>
  )
}
