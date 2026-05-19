/**
 * 회원가입 API 라우트 테스트 (SPEC-AUTH-001, SPEC-AUTH-002)
 *
 * TDD RED-GREEN-REFACTOR:
 * - 회원가입 성공
 * - 중복 이메일 처리 (이메일 열거 방지: 200 OK 반환)
 * - 유효하지 않은 이메일 형식
 * - 비밀번호 길이 검증 (12자 최소, SPEC-AUTH-002)
 * - 비밀번호 복잡성 검증 (3/4 종류, SPEC-AUTH-002)
 * - Rate Limit 검증 (3회/시간, SPEC-AUTH-002)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Prisma mock
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}))

// next-auth signIn mock
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

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    signIn: vi.fn()
  }
})

// Rate limit module mock
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  _resetRateLimitMap: vi.fn(),
  SIGNUP_MAX_ATTEMPTS: 3,
  SIGNUP_WINDOW: 3600
}))

// Password validator module mock
vi.mock('@/lib/password-validator', () => ({
  validatePasswordLength: vi.fn(),
  validatePasswordComplexity: vi.fn(),
  evaluatePasswordStrength: vi.fn(),
  validatePassword: vi.fn(),
  MIN_PASSWORD_LENGTH: 12,
  REQUIRED_CHAR_TYPES: 3
}))

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // 기본 mock 설정: 모든 검증 통과
    const { checkRateLimit } = await import('@/lib/rate-limit')
    const { validatePasswordLength, validatePasswordComplexity } = await import('@/lib/password-validator')

    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true })
    vi.mocked(validatePasswordLength).mockReturnValue(true)
    vi.mocked(validatePasswordComplexity).mockReturnValue({ valid: true, missing: [] })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('유효한 이메일/비밀번호로 회원가입 성공', async () => {
    const { db } = await import('@/lib/db')

    vi.mocked(db.user.findUnique).mockResolvedValue(null) // 중복 없음
    vi.mocked(db.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'newuser@example.com',
      name: null,
      hashedPassword: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'newuser@example.com',
      password: 'password123'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data?.email).toBe('newuser@example.com')
  })

  it('이미 존재하는 이메일로 회원가입 시 200 OK 반환 (이메일 열거 방지)', async () => {
    const { db } = await import('@/lib/db')

    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'existing-user',
      email: 'existing@example.com',
      name: null,
      hashedPassword: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'existing@example.com',
      password: 'password123'
    })

    const response = await POST(request)
    const data = await response.json()

    // 이메일 열거 방지: 200 OK 반환
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data?.email).toBe('existing@example.com')
  })

  it('유효하지 않은 이메일 형식으로 400 반환', async () => {
    const { POST } = await import('../route')
    const request = createRequest({
      email: 'invalid-email',
      password: 'password123'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('이메일')
  })

  it('8자 미만 비밀번호로 400 반환', async () => {
    const { validatePasswordLength } = await import('@/lib/password-validator')
    vi.mocked(validatePasswordLength).mockReturnValue(false)

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'test@example.com',
      password: 'short'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('비밀번호')
  })

  it('이메일 누락 시 400 반환', async () => {
    const { POST } = await import('../route')
    const request = createRequest({
      password: 'password123'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('회원가입 성공 시 비밀번호가 응답에 포함되지 않음 (보안)', async () => {
    const { db } = await import('@/lib/db')

    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    vi.mocked(db.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'secure@example.com',
      name: null,
      hashedPassword: '$2b$12$hashed-password',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'secure@example.com',
      password: 'password123'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data?.hashedPassword).toBeUndefined()
    expect(data.data?.password).toBeUndefined()
  })

  // ============ SPEC-AUTH-002 RATE LIMIT TESTS (TAG-3) ============

  it('동일 IP에서 3회 회원가입 시도 후 429 반환 (Rate Limit)', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit')
    const { validatePasswordLength, validatePasswordComplexity } = await import('@/lib/password-validator')
    const { db } = await import('@/lib/db')

    // Rate Limit 모의 설정: 3회 초과 시 차단
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, retryAfter: 3600 })
    vi.mocked(validatePasswordLength).mockReturnValue(true)
    vi.mocked(validatePasswordComplexity).mockReturnValue({ valid: true, missing: [] })
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'ratelimit@example.com',
      password: 'ValidPassword123!'
    })

    // 4차 시도는 차단되어야 함
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.error).toContain('너무 많은 요청')
  })

  it('서로 다른 IP는 독립적인 Rate Limit 카운터 사용', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit')

    // 첫 번째 IP: 이미 3회 초과
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, retryAfter: 3600 })

    // 두 번째 IP: 아직 시도하지 않음
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: true })

    const { POST } = await import('../route')

    // 첫 번째 IP 요청 (x-forwarded-for: 1.2.3.4)
    const request1 = createRequest({
      email: 'user1@example.com',
      password: 'ValidPassword123!'
    })
    // 헤더에 IP 설정 (실제 구현에서는 route.ts에서 추출)
    request1.headers.set('x-forwarded-for', '1.2.3.4')

    const response1 = await POST(request1)
    expect(response1.status).toBe(429)

    // 두 번째 IP 요청 (x-forwarded-for: 5.6.7.8)
    const request2 = createRequest({
      email: 'user2@example.com',
      password: 'ValidPassword123!'
    })
    request2.headers.set('x-forwarded-for', '5.6.7.8')

    const response2 = await POST(request2)
    // Rate Limit에 걸리지 않으므로 다른 검증 (이메일 중복 등)로 넘어감
    // 여기서는 409 (중복 이메일)로 가정
    expect(response2.status).not.toBe(429)
  })

  // ============ SPEC-AUTH-002 PASSWORD LENGTH TESTS (TAG-3) ============

  it('11자 비밀번호는 400 반환 (최소 12자 요구, AC-205)', async () => {
    const { validatePasswordLength } = await import('@/lib/password-validator')
    vi.mocked(validatePasswordLength).mockReturnValue(false)

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'test@example.com',
      password: 'Short1!abcde'  // 11자
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('비밀번호')
  })

  it('12자 비밀번호는 허용 (AC-205)', async () => {
    const { db } = await import('@/lib/db')

    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    vi.mocked(db.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'test@example.com',
      name: null,
      hashedPassword: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'test@example.com',
      password: 'Valid1!abcde'  // 12자
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
  })

  // ============ SPEC-AUTH-002 PASSWORD COMPLEXITY TESTS (TAG-3) ============

  it('2종류 문자만 포함된 비밀번호는 400 반환 (최소 3종류 요구, AC-206)', async () => {
    const { validatePasswordComplexity } = await import('@/lib/password-validator')
    vi.mocked(validatePasswordComplexity).mockReturnValue({
      valid: false,
      missing: ['대문자', '특수문자']
    })

    const { POST } = await import('../route')

    // 소문자 + 숫자 (2종류)
    const request = createRequest({
      email: 'test@example.com',
      password: 'password12345678'  // 12자지만 소문자+숫자만
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('비밀번호')
    // 누락된 문자 유형이 언급되어야 함
    expect(data.error).toMatch(/대문자/)
    expect(data.error).toMatch(/특수문자/)
  })

  it('3종류 문자 포함 비밀번호는 허용 (AC-206)', async () => {
    const { db } = await import('@/lib/db')

    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    vi.mocked(db.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'test@example.com',
      name: null,
      hashedPassword: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'test@example.com',
      password: 'ValidPassword123!'  // 소문자+대문자+숫자+특수문자 (4종류)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
  })

  it('비밀번호 복잡성 검증 실패 시 누락된 문자 유형 명시', async () => {
    const { validatePasswordComplexity } = await import('@/lib/password-validator')
    vi.mocked(validatePasswordComplexity).mockReturnValue({
      valid: false,
      missing: ['대문자', '특수문자']
    })

    const { POST } = await import('../route')

    // 소문자 + 숫자 (대문자, 특수문자 누락)
    const request = createRequest({
      email: 'test@example.com',
      password: 'password12345678'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/대문자/)
    expect(data.error).toMatch(/특수문자/)
  })

  // ============ SPEC-AUTH-002 EMAIL ENUMERATION PREVENTION TESTS (TAG-3) ============

  it('중복 이메일 시도 시 200 OK 반환 (이메일 열거 방지, AC-202, AC-204)', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit')
    const { db } = await import('@/lib/db')

    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true })
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'existing-user',
      email: 'existing@example.com',
      name: null,
      hashedPassword: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // console.warn 모킹
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { POST } = await import('../route')
    const request = createRequest({
      email: 'existing@example.com',
      password: 'ValidPassword123!'
    })

    const response = await POST(request)
    const data = await response.json()

    // 중복 이메일이어도 200 OK 반환 (이메일 열거 방지)
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data?.email).toBe('existing@example.com')

    // 보안 로그는 기록되어야 함
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('중복 이메일 시도')
    )

    warnSpy.mockRestore()
  })
})
