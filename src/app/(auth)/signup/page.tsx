/**
 * 회원가입 페이지 (SPEC-AUTH-001)
 */
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Stock Watchlist - 회원가입',
  description: '새 계정을 만들어 관심종목을 관리하세요',
}

export default async function SignupPage() {
  // 이미 로그인된 사용자는 홈으로
  const session = await auth()
  if (session) {
    redirect('/')
  }

  return (
    <>
      <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-gray-900">
        회원가입
      </h2>
      <SignupForm />
    </>
  )
}
