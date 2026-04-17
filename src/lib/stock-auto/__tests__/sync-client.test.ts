/**
 * sync-client 테스트
 * TDD: RED-GREEN-REFACTOR 사이클의 RED 단계
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncWatchlistAdd, syncWatchlistRemove } from '../sync-client'

// global.fetch 모킹
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('syncWatchlistAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('성공적으로 관심종목 추가 동기화를 수행한다', async () => {
    // given
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    // when
    const result = await syncWatchlistAdd('005930', '삼성전자', 'KOSPI')

    // then
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://14.49.182.30:8080/api/mashup/sync/watchlist',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          stock_code: '005930',
          stock_name: '삼성전자',
          market: 'KOSPI',
          source: 'stock_watchlist'
        })
      })
    )
  })

  it('타임아웃 발생 시 재시도 후 실패하면 false를 반환한다', async () => {
    // given
    mockFetch.mockRejectedValueOnce(new Error('AbortError'))
    mockFetch.mockRejectedValueOnce(new Error('AbortError'))

    // when
    const result = await syncWatchlistAdd('005930', '삼성전자', 'KOSPI')

    // then
    expect(result).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(2) // 1회 시도 + 1회 재시도
  })

  it('네트워크 에러 발생 시 재시도 후 실패하면 false를 반환한다', async () => {
    // given
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    // when
    const result = await syncWatchlistAdd('005930', '삼성전자', 'KOSPI')

    // then
    expect(result).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('서버 에러 응답 시 재시도 후 실패하면 false를 반환한다', async () => {
    // given
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    // when
    const result = await syncWatchlistAdd('005930', '삼성전자', 'KOSPI')

    // then
    expect(result).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('첫 번째 실패 후 두 번째 시도가 성공하면 true를 반환한다', async () => {
    // given
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    // when
    const result = await syncWatchlistAdd('005930', '삼성전자', 'KOSPI')

    // then
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('syncWatchlistRemove', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('성공적으로 관심종목 삭제 동기화를 수행한다', async () => {
    // given
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    // when
    const result = await syncWatchlistRemove('005930')

    // then
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://14.49.182.30:8080/api/mashup/sync/watchlist/005930',
      expect.objectContaining({
        method: 'DELETE'
      })
    )
  })

  it('타임아웃 발생 시 재시도 후 실패하면 false를 반환한다', async () => {
    // given
    mockFetch.mockRejectedValueOnce(new Error('AbortError'))
    mockFetch.mockRejectedValueOnce(new Error('AbortError'))

    // when
    const result = await syncWatchlistRemove('005930')

    // then
    expect(result).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('네트워크 에러 발생 시 재시도 후 실패하면 false를 반환한다', async () => {
    // given
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    // when
    const result = await syncWatchlistRemove('005930')

    // then
    expect(result).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('서버 에러 응답 시 재시도 후 실패하면 false를 반환한다', async () => {
    // given
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    // when
    const result = await syncWatchlistRemove('005930')

    // then
    expect(result).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('첫 번째 실패 후 두 번째 시도가 성공하면 true를 반환한다', async () => {
    // given
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    // when
    const result = await syncWatchlistRemove('005930')

    // then
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('404 응답 시에도 성공으로 간주한다 (이미 삭제된 경우)', async () => {
    // given
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    })

    // when
    const result = await syncWatchlistRemove('005930')

    // then
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
