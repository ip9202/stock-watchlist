/**
 * sync-watchlist 스크립트 테스트
 * TDD: RED-GREEN-REFACTOR 사이클의 RED 단계
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    watchlist: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('@/lib/stock-auto/sync-client', () => ({
  syncWatchlistAdd: vi.fn()
}))

import { db } from '@/lib/db'
import { syncWatchlistAdd } from '@/lib/stock-auto/sync-client'

// mock type casting
const mockDb = db as any
const mockSyncWatchlistAdd = syncWatchlistAdd as any

// 스크립트 로드 (테스트를 위해 mock 후 로드)
let syncWatchlistScript: any

describe('sync-watchlist script', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('DB의 모든 관심종목을 stock_auto로 동기화한다', async () => {
    // given
    const watchlistItems = [
      { symbol: '005930', name: '삼성전자' }, // KOSPI (5번째 자리: 3)
      { symbol: '035420', name: 'NAVER' }, // KOSPI (5번째 자리: 2)
      { symbol: '066570', name: 'LG전자' } // KOSDAQ (5번째 자리: 6)
    ]

    mockDb.watchlist.findMany.mockResolvedValue(watchlistItems)
    mockSyncWatchlistAdd.mockResolvedValue(true)

    // when
    // 스크립트는 비동기로 실행되므로 import를 통해 로드
    const { main } = await import('../sync-watchlist')
    await main()

    // then
    expect(mockDb.watchlist.findMany).toHaveBeenCalled()
    expect(mockSyncWatchlistAdd).toHaveBeenCalledTimes(3)
    expect(mockSyncWatchlistAdd).toHaveBeenNthCalledWith(1, '005930', '삼성전자', 'KOSPI')
    expect(mockSyncWatchlistAdd).toHaveBeenNthCalledWith(2, '035420', 'NAVER', 'KOSPI')
    expect(mockSyncWatchlistAdd).toHaveBeenNthCalledWith(3, '066570', 'LG전자', 'KOSDAQ')
  })

  it('동기화 실패 시에도 다음 종목 계속 진행한다', async () => {
    // given
    const watchlistItems = [
      { symbol: '005930', name: '삼성전자' },
      { symbol: '035420', name: 'NAVER' },
      { symbol: '066570', name: 'LG전자' }
    ]

    mockDb.watchlist.findMany.mockResolvedValue(watchlistItems)
    mockSyncWatchlistAdd
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(true)

    // when
    const { main } = await import('../sync-watchlist')
    await main()

    // then
    expect(mockSyncWatchlistAdd).toHaveBeenCalledTimes(3)
  })

  it('DB에 관심종목이 없으면 아무것도 하지 않는다', async () => {
    // given
    mockDb.watchlist.findMany.mockResolvedValue([])

    // when
    const { main } = await import('../sync-watchlist')
    await main()

    // then
    expect(mockDb.watchlist.findMany).toHaveBeenCalled()
    expect(mockSyncWatchlistAdd).not.toHaveBeenCalled()
  })

  it('각 동기화 호출 사이에 딜레이가 있다 (레이트 리미팅 방지)', async () => {
    // given
    const watchlistItems = [
      { symbol: '005930', name: '삼성전자' },
      { symbol: '035420', name: 'NAVER' }
    ]

    mockDb.watchlist.findMany.mockResolvedValue(watchlistItems)
    mockSyncWatchlistAdd.mockResolvedValue(true)

    const startTime = Date.now()

    // when
    const { main } = await import('../sync-watchlist')
    await main()

    const endTime = Date.now()
    const elapsedTime = endTime - startTime

    // then - 최소 100ms 딜레이 있어야 함
    expect(elapsedTime).toBeGreaterThanOrEqual(100)
  })
})
