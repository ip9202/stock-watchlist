'use client'

/**
 * 로그인 폼 컴포넌트 (SPEC-AUTH-001)
 *
 * - 이메일/비밀번호 입력
 * - signIn('credentials', { redirect: false }) 사용
 * - 실패 시 에러 메시지 표시
 * - 성공 시 '/' 리다이렉트 (basePath /stocks 자동 적용)
 */
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// @MX:ANCHOR: [AUTO] 로그인 폼 - LoginPage, 인증 플로우의 핵심 진입점
// @MX:REASON: 사용자 인증 흐름의 시작점, NextAuth signIn 호출의 단일 지점
export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // @MX:WARN: [AUTO] 인증 에러 처리 - CredentialsSignin 에러는 계정 존재 여부 노출 금지
  // @MX:REASON: 보안상 이메일/비밀번호 오류 구분하지 않는 동일 메시지 표시
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      if (result?.ok) {
        router.push('/')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          이메일
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
          autoComplete="email"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          비밀번호
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? '로그인 중...' : '로그인'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        계정이 없으신가요?{' '}
        <Link
          href="/signup"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          회원가입
        </Link>
      </p>
    </form>
  )
}
