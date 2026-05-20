/**
 * SignupForm 컴포넌트 테스트 (SPEC-AUTH-001 + SPEC-AUTH-002)
 *
 * TDD RED → GREEN → REFACTOR 사이클
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupForm } from '../SignupForm'

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

// fetch 전역 모킹
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('이메일 입력 필드를 렌더링한다', () => {
      render(<SignupForm />)
      expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument()
    })

    it('비밀번호 입력 필드를 렌더링한다', () => {
      render(<SignupForm />)
      expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    })

    it('비밀번호 확인 입력 필드를 렌더링한다', () => {
      render(<SignupForm />)
      expect(screen.getByLabelText(/비밀번호 확인/i)).toBeInTheDocument()
    })

    it('회원가입 버튼을 렌더링한다', () => {
      render(<SignupForm />)
      expect(screen.getByRole('button', { name: /회원가입/i })).toBeInTheDocument()
    })

    it('로그인 링크를 렌더링한다', () => {
      render(<SignupForm />)
      expect(screen.getByRole('link', { name: /로그인/i })).toBeInTheDocument()
    })
  })

  describe('비밀번호 불일치 실시간 오류', () => {
    it('비밀번호와 확인이 다르면 오류 메시지를 표시한다', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)

      await user.type(screen.getByLabelText('비밀번호'), 'password123')
      await user.type(screen.getByLabelText(/비밀번호 확인/i), 'different')

      await waitFor(() => {
        expect(screen.getByText(/비밀번호가 일치하지 않습니다/i)).toBeInTheDocument()
      })
    })

    it('비밀번호가 일치하면 오류 메시지를 표시하지 않는다', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)

      await user.type(screen.getByLabelText('비밀번호'), 'password123')
      await user.type(screen.getByLabelText(/비밀번호 확인/i), 'password123')

      await waitFor(() => {
        expect(screen.queryByText(/비밀번호가 일치하지 않습니다/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('회원가입 성공', () => {
    it('성공 시 녹색 성공 메시지를 표시하고 로그인 페이지로 이동한다', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      const user = userEvent.setup()

      render(<SignupForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'new@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123456')
      await user.type(screen.getByLabelText(/비밀번호 확인/i), 'password123456')
      await user.click(screen.getByRole('button', { name: /회원가입/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/signup',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })

      // 성공 메시지 확인 (녹색)
      const successMessage = screen.getByText(/회원가입이 완료되었습니다/i)
      expect(successMessage).toBeInTheDocument()
      expect(successMessage).toHaveClass('text-green-600')

      // 2.5초 기다림 후 로그인 페이지 이동 확인
      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalledWith('/login')
        },
        { timeout: 3000 }
      )
    }, 10000)
  })

  describe('중복 이메일 에러 처리', () => {
    it('이미 존재하는 이메일이면 에러 메시지를 표시한다', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: '이미 사용 중인 이메일입니다.' }),
      })
      const user = userEvent.setup()

      render(<SignupForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'exists@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123')
      await user.type(screen.getByLabelText(/비밀번호 확인/i), 'password123')
      await user.click(screen.getByRole('button', { name: /회원가입/i }))

      await waitFor(() => {
        expect(screen.getByText(/이미 사용 중인 이메일입니다/i)).toBeInTheDocument()
      })
    })
  })

  describe('SPEC-AUTH-002 TAG-6: PasswordStrengthIndicator 통합', () => {
    it('비밀번호 입력 시 PasswordStrengthIndicator를 렌더링한다', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)

      const passwordInput = screen.getByLabelText('비밀번호')
      await user.type(passwordInput, 'weak')

      // PasswordStrengthIndicator가 렌더링되는지 확인
      await waitFor(() => {
        expect(screen.getByText(/암호 강도:/i)).toBeInTheDocument()
      })
    })

    it('비밀번호가 비어있으면 PasswordStrengthIndicator를 렌더링하지 않는다', () => {
      render(<SignupForm />)

      // 빈 상태에서는 강도 표시기가 보이지 않아야 함
      expect(screen.queryByText(/암호 강도:/i)).not.toBeInTheDocument()
    })
  })

  describe('SPEC-AUTH-002 TAG-6: 비밀번호 minLength 8자로 변경', () => {
    it('비밀번호 플레이스홀더에 8자 이상 안내를 표시한다', () => {
      render(<SignupForm />)

      const passwordInput = screen.getByLabelText('비밀번호')
      expect(passwordInput).toHaveAttribute('placeholder', '비밀번호 입력 (8자 이상)')
    })

    it('비밀번호 입력 필드의 minLength가 8로 설정되어 있다', () => {
      render(<SignupForm />)

      const passwordInput = screen.getByLabelText('비밀번호')
      expect(passwordInput).toHaveAttribute('minLength', '8')
    })
  })

  describe('SPEC-AUTH-002 TAG-6: Rate Limit 에러 처리', () => {
    it('429 응답 시 Rate Limit 에러 메시지를 표시한다', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Too Many Requests' }),
      })
      const user = userEvent.setup()

      render(<SignupForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'test@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123456')
      await user.type(screen.getByLabelText(/비밀번호 확인/i), 'password123456')
      await user.click(screen.getByRole('button', { name: /회원가입/i }))

      await waitFor(() => {
        expect(screen.getByText(/잠시 후 다시 시도해 주세요/i)).toBeInTheDocument()
      })
    })

    it('429 응답에 retryAfter가 포함되면 카운트다운을 표시한다', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Too Many Requests', retryAfter: 30 }),
      })
      const user = userEvent.setup()

      render(<SignupForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'test@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123456')
      await user.type(screen.getByLabelText(/비밀번호 확인/i), 'password123456')
      await user.click(screen.getByRole('button', { name: /회원가입/i }))

      await waitFor(() => {
        expect(screen.getByText(/30초 후 다시 시도해 주세요/i)).toBeInTheDocument()
      })
    })
  })

  describe('SPEC-AUTH-002 TAG-6: 이메일 열거 방지 (항상 성공 응답)', () => {
    it('회원가입 성공 시 항상 성공 메시지를 표시하고 로그인 페이지로 이동한다', async () => {
      // 중복 이메일이어도 409 대신 200 반환 (이메일 열거 방지)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      const user = userEvent.setup()

      render(<SignupForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'exists@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123456')
      await user.type(screen.getByLabelText(/비밀번호 확인/i), 'password123456')
      await user.click(screen.getByRole('button', { name: /회원가입/i }))

      // 성공 메시지 확인 (녹색)
      const successMessage = screen.getByText(/회원가입이 완료되었습니다/i)
      expect(successMessage).toBeInTheDocument()
      expect(successMessage).toHaveClass('text-green-600')

      // 2.5초 기다림 (2초 타이머 + waitFor 기다림)
      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalledWith('/login')
        },
        { timeout: 3000 }
      )
    }, 10000) // 테스트 타임아웃 10초
  })
})
