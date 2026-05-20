'use client'

/**
 * 로그인 폼 컴포넌트 (SPEC-AUTH-001 + SPEC-AUTH-002)
 *
 * - 이메일/비밀번호 입력
 * - signIn('credentials', { redirect: false }) 사용
 * - 실패 시 에러 메시지 표시
 * - 성공 시 '/' 리다이렉트 (basePath /stocks 자동 적용)
 * - SPEC-AUTH-002: 429 Rate Limit 에러 처리
 */
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// @MX:ANCHOR: [AUTO] 로그인 폼 - LoginPage, 인증 플로우의 핵심 진입점
// @MX:REASON: 사용자 인증 흐름의 시작점, NextAuth signIn 호출의 단일 지점
interface LoginFormProps {
  initialError?: string
}

function mapAuthError(error: string | null | undefined): string | null {
  if (!error) return null
  if (error.includes('CredentialsSignin') || error === 'credentials') {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  return '로그인 중 오류가 발생했습니다. 다시 시도해 주세요.'
}

export function LoginForm({ initialError }: LoginFormProps = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(mapAuthError(initialError))
  const [isLoading, setIsLoading] = useState(false)

  // @MX:WARN: [AUTO] 인증 에러 처리 - CredentialsSignin 에러는 계정 존재 여부 노출 금지
  // @MX:REASON: 보안상 이메일/비밀번호 오류 구분하지 않는 동일 메시지 표시
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // basePath 인식을 위해 callbackUrl 명시적 지정
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: `${window.location.origin}/stocks`,
        redirect: false,  // 페이지 자동 리다이렉트 방지
      })

      // 결과 확인
      if (result?.ok) {
        // 로그인 성공 - 세션 쿠키 설정을 위해 전체 페이지 새로고침
        window.location.href = '/stocks'
        return
      }

      // 에러 처리
      if (result?.error) {
        // 에러 타입 확인
        const error = result.error

        // SPEC-AUTH-002: 429 Rate Limit 에러 처리 (result.status 기준 - NextAuth v5 beta)
        if (result?.status === 429) {
          setError('너무 많은 로그인 시도입니다. 잠시 후 다시 시도해 주세요.')
          return
        }

        if (typeof error === 'string' && error.includes('CredentialsSignin')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
          return
        }

        // 기타 에러
        setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.')
        console.error('Login error:', error)
        return
      }

      // 결과가 없는 경우
      setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } catch (err) {
      // 네트워크 에러 등
      console.error('Login exception:', err)
      setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')
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
