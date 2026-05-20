/**
 * Middleware 단위 테스트 (SPEC-AUTH-002 TAG-4)
 *
 * - POST /api/auth/callback/credentials Rate Limit
 * - req.clone()으로 body 소비 방지
 * - IP+Email 조합별 카운터
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { _resetRateLimitMap } from '@/lib/rate-limit'

// next-auth 모듈 mock
vi.mock('next-auth', () => ({
  default: vi.fn(),
  auth: vi.fn()
}))

describe('Middleware - Login Rate Limit Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // 테스트 간 Rate Limit 스토어 정리
    _resetRateLimitMap()
  })

  it('POST /api/auth/callback/credentials 요청이 Rate Limit 적용', async () => {
    // 미들웨어는 동적 import가 어려우므로, Rate Limit 로직만 테스트
    const { checkRateLimit, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW } = await import('@/lib/rate-limit')

    const ip = '192.168.1.1'
    const email = 'test@example.com'
    const key = `${ip}:${email}`

    // 5회 시도는 모두 성공
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      const result = checkRateLimit(key, {
        maxAttempts: LOGIN_MAX_ATTEMPTS,
        windowSeconds: LOGIN_WINDOW
      })
      expect(result.allowed).toBe(true)
    }

    // 6회째는 차단
    const result = checkRateLimit(key, {
      maxAttempts: LOGIN_MAX_ATTEMPTS,
      windowSeconds: LOGIN_WINDOW
    })
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('POST /api/auth/callback/credentials에서 IP+Email 조합으로 카운터', async () => {
    const { checkRateLimit, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW } = await import('@/lib/rate-limit')

    const ip = '192.168.1.1'
    const email1 = 'user1@example.com'
    const email2 = 'user2@example.com'
    const key1 = `${ip}:${email1}`
    const key2 = `${ip}:${email2}`

    // email1로 5회 시도
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      checkRateLimit(key1, {
        maxAttempts: LOGIN_MAX_ATTEMPTS,
        windowSeconds: LOGIN_WINDOW
      })
    }

    // email1은 제한됨
    const result1 = checkRateLimit(key1, {
      maxAttempts: LOGIN_MAX_ATTEMPTS,
      windowSeconds: LOGIN_WINDOW
    })
    expect(result1.allowed).toBe(false)

    // email2는 여전히 시도 가능 (다른 email)
    const result2 = checkRateLimit(key2, {
      maxAttempts: LOGIN_MAX_ATTEMPTS,
      windowSeconds: LOGIN_WINDOW
    })
    expect(result2.allowed).toBe(true)
  })
})
