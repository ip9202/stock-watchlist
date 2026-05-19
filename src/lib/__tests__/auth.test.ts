/**
 * Auth 설정 단위 테스트 (SPEC-AUTH-001)
 *
 * TDD RED-GREEN-REFACTOR:
 * - authorizeCredentials 함수 직접 테스트 (next-auth 서버 환경 불필요)
 * - bcryptjs 비밀번호 검증
 * - 계정 존재 여부 노출 방지
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcryptjs from 'bcryptjs'

// next-auth 모듈 mock (서버 환경 의존성 제거)
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn()
  }))
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({ id: 'credentials', type: 'credentials' }))
}))

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({}))
}))

// Prisma mock
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

// @MX:ANCHOR: [AUTO] 인증 핵심 로직 테스트 - authorizeCredentials 함수
// @MX:REASON: 보안 핵심 함수로 모든 로그인 시나리오를 검증해야 함
describe('Auth - authorizeCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('올바른 이메일/비밀번호로 로그인 시 사용자 객체 반환', async () => {
    const { db } = await import('@/lib/db')
    const hashedPassword = await bcryptjs.hash('password123', 12)

    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const { authorizeCredentials } = await import('@/lib/auth')

    const result = await authorizeCredentials({
      email: 'test@example.com',
      password: 'password123'
    })

    expect(result).not.toBeNull()
    expect(result?.email).toBe('test@example.com')
    expect(result?.id).toBe('user-1')
  })

  it('잘못된 비밀번호로 로그인 시 null 반환', async () => {
    const { db } = await import('@/lib/db')
    const hashedPassword = await bcryptjs.hash('correct-password', 12)

    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const { authorizeCredentials } = await import('@/lib/auth')

    const result = await authorizeCredentials({
      email: 'test@example.com',
      password: 'wrong-password'
    })

    expect(result).toBeNull()
  })

  it('존재하지 않는 이메일로 로그인 시 null 반환 (계정 존재 여부 노출 방지)', async () => {
    const { db } = await import('@/lib/db')

    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    const { authorizeCredentials } = await import('@/lib/auth')

    const result = await authorizeCredentials({
      email: 'nonexistent@example.com',
      password: 'password123'
    })

    expect(result).toBeNull()
  })

  it('hashedPassword가 없는 사용자(OAuth 사용자)로 로그인 시 null 반환', async () => {
    const { db } = await import('@/lib/db')

    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'oauth@example.com',
      name: 'OAuth User',
      hashedPassword: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const { authorizeCredentials } = await import('@/lib/auth')

    const result = await authorizeCredentials({
      email: 'oauth@example.com',
      password: 'any-password'
    })

    expect(result).toBeNull()
  })

  it('이메일이 없는 경우 null 반환', async () => {
    const { authorizeCredentials } = await import('@/lib/auth')

    const result = await authorizeCredentials({
      email: '',
      password: 'password123'
    })

    expect(result).toBeNull()
  })

  it('비밀번호가 없는 경우 null 반환', async () => {
    const { authorizeCredentials } = await import('@/lib/auth')

    const result = await authorizeCredentials({
      email: 'test@example.com',
      password: ''
    })

    expect(result).toBeNull()
  })
})
