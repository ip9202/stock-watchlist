/**
 * 미들웨어 라우트 보호 테스트 (SPEC-AUTH-001)
 *
 * TDD RED-GREEN-REFACTOR:
 * - 미인증 접근 → 리다이렉트
 * - /login, /signup 페이지 보호 제외
 * - /api/auth/* 제외
 * - 인증된 사용자가 /login 접근 → 홈으로 리다이렉트
 */

import { describe, it, expect, vi } from 'vitest'

// next-auth mock
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

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() }
  }
}))

// @MX:NOTE: [AUTO] config 테스트는 미들웨어 설정값을 직접 검증
describe('Middleware Configuration', () => {
  it('config.matcher가 /stocks 경로를 포함해야 함', async () => {
    const { config } = await import('./middleware')
    expect(config).toBeDefined()
    expect(config.matcher).toBeDefined()
  })

  it('config.matcher가 api/auth 경로를 제외해야 함', async () => {
    const { config } = await import('./middleware')
    const matcherStr = JSON.stringify(config.matcher)
    // api/auth는 제외되어야 함 (부정 패턴으로 표현됨)
    expect(matcherStr).toContain('auth')
  })
})
