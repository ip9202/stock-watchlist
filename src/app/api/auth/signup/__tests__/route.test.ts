/**
 * 회원가입 API 라우트 테스트 (SPEC-AUTH-001)
 *
 * TDD RED-GREEN-REFACTOR:
 * - 회원가입 성공
 * - 중복 이메일 처리
 * - 유효하지 않은 이메일 형식
 * - 짧은 비밀번호 (8자 미만)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
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

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('이미 존재하는 이메일로 회원가입 시 409 반환', async () => {
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

    expect(response.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toContain('이미 사용 중인 이메일')
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
})
