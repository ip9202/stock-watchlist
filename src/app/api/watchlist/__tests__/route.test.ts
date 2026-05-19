/**
 * watchlist API 경로 테스트
 * TDD: RED-GREEN-REFACTOR 사이클의 RED 단계
 */
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { vi } from 'vitest'

// mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn()
    },
    watchlist: {
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn()
    }
  }
}))

vi.mock('@/lib/stock-auto/sync-client', () => ({
  syncWatchlistAdd: vi.fn()
}))

// auth mock - 세션 기반 인증 (SPEC-AUTH-001)
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'demo@example.com' }
  }),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn()
}))

import { db } from '@/lib/db'
import { syncWatchlistAdd } from '@/lib/stock-auto/sync-client'

// mock type casting
const mockDb = db as any
const mockSyncWatchlistAdd = syncWatchlistAdd as any

describe('POST /api/watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('관심종목 추가 후 stock_auto로 동기화한다 (KOSPI)', async () => {
    // given
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com'
    })

    mockDb.watchlist.findUnique.mockResolvedValue(null)
    mockDb.watchlist.aggregate.mockResolvedValue({ _max: { order: 0 } })

    const createdItem = {
      id: 'watch-1',
      userId: 'user-1',
      symbol: '005930',
      name: '삼성전자',
      order: 1
    }
    mockDb.watchlist.create.mockResolvedValue(createdItem)

    mockSyncWatchlistAdd.mockResolvedValue(true)

    const request = new NextRequest('http://localhost:3000/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol: '005930', name: '삼성전자' })
    })

    // when
    const response = await POST(request)
    const data = await response.json()

    // then
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(createdItem)

    // DB 저장 확인
    expect(mockDb.watchlist.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        symbol: '005930',
        name: '삼성전자',
        order: 1
      }
    })

    // 동기화 호출 확인 (KOSPI)
    expect(mockSyncWatchlistAdd).toHaveBeenCalledWith('005930', '삼성전자', 'KOSPI')
    expect(mockSyncWatchlistAdd).toHaveBeenCalledTimes(1)
  })

  it('관심종목 추가 후 stock_auto로 동기화한다 (KOSDAQ - 종목코드 5번째 자리가 4~9)', async () => {
    // given
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com'
    })

    mockDb.watchlist.findUnique.mockResolvedValue(null)
    mockDb.watchlist.aggregate.mockResolvedValue({ _max: { order: 0 } })

    const createdItem = {
      id: 'watch-2',
      userId: 'user-1',
      symbol: '066570', // LG전자 (KOSDAQ)
      name: 'LG전자',
      order: 1
    }
    mockDb.watchlist.create.mockResolvedValue(createdItem)

    mockSyncWatchlistAdd.mockResolvedValue(true)

    const request = new NextRequest('http://localhost:3000/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol: '066570', name: 'LG전자' })
    })

    // when
    const response = await POST(request)
    const data = await response.json()

    // then
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)

    // 동기화 호출 확인 (KOSDAQ)
    expect(mockSyncWatchlistAdd).toHaveBeenCalledWith('066570', 'LG전자', 'KOSDAQ')
  })

  it('동기화 실패 시에도 API 응답은 성공을 반환한다 (fire-and-forget)', async () => {
    // given
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com'
    })

    mockDb.watchlist.findUnique.mockResolvedValue(null)
    mockDb.watchlist.aggregate.mockResolvedValue({ _max: { order: 0 } })

    const createdItem = {
      id: 'watch-1',
      userId: 'user-1',
      symbol: '005930',
      name: '삼성전자',
      order: 1
    }
    mockDb.watchlist.create.mockResolvedValue(createdItem)

    // 동기화 실패
    mockSyncWatchlistAdd.mockResolvedValue(false)

    const request = new NextRequest('http://localhost:3000/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol: '005930', name: '삼성전자' })
    })

    // when
    const response = await POST(request)
    const data = await response.json()

    // then - API 응답은 성공이어야 함
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(createdItem)

    // 동기화는 실패했지만 호출됨
    expect(mockSyncWatchlistAdd).toHaveBeenCalledWith('005930', '삼성전자', 'KOSPI')
  })

  it('DB 저장 실패 시 동기화는 호출되지 않는다', async () => {
    // given
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com'
    })

    // 중복 종목
    mockDb.watchlist.findUnique.mockResolvedValue({
      id: 'existing-watch',
      userId: 'user-1',
      symbol: '005930',
      name: '삼성전자',
      order: 1
    })

    const request = new NextRequest('http://localhost:3000/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol: '005930', name: '삼성전자' })
    })

    // when
    const response = await POST(request)

    // then
    expect(response.status).toBe(409)
    expect(mockSyncWatchlistAdd).not.toHaveBeenCalled()
  })
})
