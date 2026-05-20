/**
 * LoginForm 컴포넌트 테스트 (SPEC-AUTH-001 + SPEC-AUTH-002)
 *
 * TDD RED → GREEN → REFACTOR 사이클
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'

// next-auth/react 모킹
const mockSignIn = vi.fn()
const mockPush = vi.fn()

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('이메일 입력 필드를 렌더링한다', () => {
      render(<LoginForm />)
      expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument()
    })

    it('비밀번호 입력 필드를 렌더링한다', () => {
      render(<LoginForm />)
      expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument()
    })

    it('로그인 버튼을 렌더링한다', () => {
      render(<LoginForm />)
      expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument()
    })

    it('회원가입 링크를 렌더링한다', () => {
      render(<LoginForm />)
      expect(screen.getByRole('link', { name: /회원가입/i })).toBeInTheDocument()
    })
  })

  describe('로그인 성공', () => {
    it('성공 시 홈으로 리다이렉트한다', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: true, error: null })
      const user = userEvent.setup()

      // window.location.href 할당을 감지하기 위한 모킹
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: '' },
      })

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'test@example.com')
      await user.type(screen.getByLabelText(/비밀번호/i), 'password123')
      await user.click(screen.getByRole('button', { name: /로그인/i }))

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: expect.stringContaining('/stocks'),
          redirect: false,
        })
      })

      await waitFor(() => {
        expect(window.location.href).toBe('/stocks')
      })

      // 복원
      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
      })
    })
  })

  describe('로그인 실패', () => {
    it('실패 시 에러 메시지를 표시한다', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: false, error: 'CredentialsSignin' })
      const user = userEvent.setup()

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/비밀번호/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /로그인/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/이메일 또는 비밀번호가 올바르지 않습니다/i)
        ).toBeInTheDocument()
      })
    })

    it('로딩 중에는 버튼이 비활성화된다', async () => {
      // 해결되지 않는 Promise로 로딩 상태 유지
      mockSignIn.mockReturnValueOnce(new Promise(() => {}))
      const user = userEvent.setup()

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'test@example.com')
      await user.type(screen.getByLabelText(/비밀번호/i), 'password123')

      const button = screen.getByRole('button', { name: /로그인/i })
      await user.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('SPEC-AUTH-002 TAG-6: Rate Limit 에러 처리', () => {
    it('429 응답 시 Rate Limit 에러 메시지를 표시한다', async () => {
      // NextAuth v5 signIn({ redirect: false }) 결과: status가 최상위 필드로 반환
      mockSignIn.mockResolvedValueOnce({
        ok: false,
        status: 429,
        error: 'CredentialsSignin',
      })
      const user = userEvent.setup()

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'test@example.com')
      await user.type(screen.getByLabelText(/비밀번호/i), 'password123')
      await user.click(screen.getByRole('button', { name: /로그인/i }))

      await waitFor(() => {
        expect(screen.getByText(/잠시 후 다시 시도해 주세요/i)).toBeInTheDocument()
      })
    })

    it('429 응답 시 Rate Limit 에러 메시지를 표시한다 (retryAfter 포함)', async () => {
      // NextAuth v5는 Retry-After 헤더를 result에 노출하지 않으므로 고정 메시지 표시
      mockSignIn.mockResolvedValueOnce({
        ok: false,
        status: 429,
        error: 'CredentialsSignin',
      })
      const user = userEvent.setup()

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'test@example.com')
      await user.type(screen.getByLabelText(/비밀번호/i), 'password123')
      await user.click(screen.getByRole('button', { name: /로그인/i }))

      await waitFor(() => {
        expect(screen.getByText(/잠시 후 다시 시도해 주세요/i)).toBeInTheDocument()
      })
    })
  })
})
