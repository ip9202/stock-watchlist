/**
 * SignupForm 컴포넌트 테스트 (SPEC-AUTH-001)
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
    it('성공 후 자동 로그인하고 홈으로 이동한다', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      mockSignIn.mockResolvedValueOnce({ ok: true, error: null })
      const user = userEvent.setup()

      render(<SignupForm />)

      await user.type(screen.getByLabelText(/이메일/i), 'new@example.com')
      await user.type(screen.getByLabelText('비밀번호'), 'password123')
      await user.type(screen.getByLabelText(/비밀번호 확인/i), 'password123')
      await user.click(screen.getByRole('button', { name: /회원가입/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/signup',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
          email: 'new@example.com',
          password: 'password123',
          redirect: false,
        }))
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })
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
})
