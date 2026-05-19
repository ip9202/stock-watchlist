'use client'

/**
 * 회원가입 폼 컴포넌트 (SPEC-AUTH-001)
 *
 * - 이메일/비밀번호/비밀번호 확인 입력
 * - 비밀번호 불일치 실시간 오류 표시
 * - POST /api/auth/signup 호출
 * - 성공 후 signIn() 자동 로그인 → '/' 리다이렉트
 */
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// @MX:ANCHOR: [AUTO] 회원가입 폼 - SignupPage의 핵심 컴포넌트
// @MX:REASON: 신규 사용자 생성 및 자동 로그인 플로우의 단일 진입점
export function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 비밀번호 불일치 실시간 감지
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      // 회원가입 API 호출
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '회원가입 중 오류가 발생했습니다.')
        return
      }

      // 자동 로그인
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError('회원가입은 완료됐지만 로그인에 실패했습니다. 다시 로그인해 주세요.')
        return
      }

      router.push('/')
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
          placeholder="비밀번호 입력 (8자 이상)"
          required
          autoComplete="new-password"
          disabled={isLoading}
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700"
        >
          비밀번호 확인
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="비밀번호 재입력"
          required
          autoComplete="new-password"
          disabled={isLoading}
        />
        {passwordMismatch && (
          <p className="text-sm text-red-600" role="alert">
            비밀번호가 일치하지 않습니다.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || passwordMismatch}
      >
        {isLoading ? '처리 중...' : '회원가입'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        이미 계정이 있으신가요?{' '}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          로그인
        </Link>
      </p>
    </form>
  )
}
