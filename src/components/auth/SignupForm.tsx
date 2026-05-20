'use client'

/**
 * 회원가입 폼 컴포넌트 (SPEC-AUTH-001 + SPEC-AUTH-002)
 *
 * - 이메일/비밀번호/비밀번호 확인 입력
 * - 비밀번호 불일치 실시간 오류 표시
 * - POST /api/auth/signup 호출
 * - 성공 후 성공 메시지 표시 → '/login' 리다이렉트
 * - SPEC-AUTH-002: PasswordStrengthIndicator, 429 에러 처리, 이메일 열거 방지
 */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'

// @MX:ANCHOR: [AUTO] 회원가입 폼 - SignupPage의 핵심 컴포넌트
// @MX:REASON: 신규 사용자 생성 플로우의 단일 진입점 (SPEC-AUTH-002: 이메일 열거 방지 적용)

interface SignupResponse {
  success?: boolean
  error?: string
  retryAfter?: number
}

export function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 비밀번호 불일치 실시간 감지
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword

  // cleanup: 타이머 정리
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다.')
      setIsSuccess(false)
      return
    }

    setMessage(null)
    setIsSuccess(false)
    setIsLoading(true)

    try {
      // 회원가입 API 호출
      const response = await fetch('/stocks/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data: SignupResponse = await response.json()

      // SPEC-AUTH-002: 429 Rate Limit 처리
      if (response.status === 429) {
        const retryAfter = data.retryAfter || 0
        const errorMessage = retryAfter > 0
          ? `${retryAfter}초 후 다시 시도해 주세요.`
          : '잠시 후 다시 시도해 주세요.'
        setMessage(errorMessage)
        setIsSuccess(false)
        return
      }

      if (!response.ok) {
        setMessage(data.error || '회원가입 중 오류가 발생했습니다.')
        setIsSuccess(false)
        return
      }

      // SPEC-AUTH-002: 이메일 열거 방지 - 항상 성공 메시지 표시
      // 실제 계정 생성 여부와 상관없이 성공 응답 처리
      setMessage('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.')
      setIsSuccess(true)

      // 2초 후 로그인 페이지로 이동 (성공 메시지 확인을 위해)
      redirectTimerRef.current = setTimeout(() => {
        router.push('/stocks/login')
      }, 2000)
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
        {/* SPEC-AUTH-002 TAG-5: PasswordStrengthIndicator 통합 */}
        <PasswordStrengthIndicator password={password} />
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

      {message && (
        <p
          className={`text-sm ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
          role="alert"
        >
          {message}
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
          href="/stocks/login"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          로그인
        </Link>
      </p>
    </form>
  )
}
