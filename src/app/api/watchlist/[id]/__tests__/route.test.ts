/**
 * watchlist/[id] API 경로 테스트
 * TDD: RED-GREEN-REFACTOR 사이클의 RED 단계
 */
import { DELETE } from '../route'
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
      delete: vi.fn()
    }
  }
}))

vi.mock('@/lib/stock-auto/sync-client', () => ({
  syncWatchlistRemove: vi.fn()
}))

import { db } from '@/lib/db'
import { syncWatchlistRemove } from '@/lib/stock-auto/sync-client'

// mock type casting
const mockDb = db as any
const mockSyncWatchlistRemove = syncWatchlistRemove as any

describe('DELETE /api/watchlist/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('관심종목 삭제 후 stock_auto로 동기화한다', async () => {
    // given
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com'
    })

    const existingItem = {
      id: 'watch-1',
      userId: 'user-1',
      symbol: '005930',
      name: '삼성전자',
      order: 1
    }
    mockDb.watchlist.findUnique.mockResolvedValue(existingItem)
    mockDb.watchlist.delete.mockResolvedValue(existingItem)

    mockSyncWatchlistRemove.mockResolvedValue(true)

    const request = new NextRequest('http://localhost:3000/api/watchlist/watch-1', {
      method: 'DELETE'
    })

    // when
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'watch-1' })
    })
    const data = await response.json()

    // then
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // DB 삭제 확인
    expect(mockDb.watchlist.delete).toHaveBeenCalledWith({
      where: { id: 'watch-1' }
    })

    // 동기화 호출 확인
    expect(mockSyncWatchlistRemove).toHaveBeenCalledWith('005930')
    expect(mockSyncWatchlistRemove).toHaveBeenCalledTimes(1)
  })

  it('동기화 실패 시에도 API 응답은 성공을 반환한다 (fire-and-forget)', async () => {
    // given
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com'
    })

    const existingItem = {
      id: 'watch-1',
      userId: 'user-1',
      symbol: '005930',
      name: '삼성전자',
      order: 1
    }
    mockDb.watchlist.findUnique.mockResolvedValue(existingItem)
    mockDb.watchlist.delete.mockResolvedValue(existingItem)

    // 동기화 실패
    mockSyncWatchlistRemove.mockResolvedValue(false)

    const request = new NextRequest('http://localhost:3000/api/watchlist/watch-1', {
      method: 'DELETE'
    })

    // when
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'watch-1' })
    })
    const data = await response.json()

    // then - API 응답은 성공이어야 함
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // 동기화는 실패했지만 호출됨
    expect(mockSyncWatchlistRemove).toHaveBeenCalledWith('005930')
  })

  it('DB 삭제 실패 시 동기화는 호출되지 않는다', async () => {
    // given
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com'
    })

    // 존재하지 않는 항목
    mockDb.watchlist.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/watchlist/watch-1', {
      method: 'DELETE'
    })

    // when
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'watch-1' })
    })

    // then
    expect(response.status).toBe(404)
    expect(mockSyncWatchlistRemove).not.toHaveBeenCalled()
  })

  it('사용자 권한 없음 시 동기화는 호출되지 않는다', async () => {
    // given
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'demo@example.com'
    })

    const existingItem = {
      id: 'watch-1',
      userId: 'user-1', // 다른 사용자
      symbol: '005930',
      name: '삼성전자',
      order: 1
    }
    mockDb.watchlist.findUnique.mockResolvedValue(existingItem)

    const request = new NextRequest('http://localhost:3000/api/watchlist/watch-1', {
      method: 'DELETE'
    })

    // when
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'watch-1' })
    })

    // then
    expect(response.status).toBe(403)
    expect(mockSyncWatchlistRemove).not.toHaveBeenCalled()
  })
})
