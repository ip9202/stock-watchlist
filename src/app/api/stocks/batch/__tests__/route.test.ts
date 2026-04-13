/**
 * 배치 종목 조회 API Route 테스트 (SPEC-POLL-001, REQ-POLL-002)
 * POST /api/stocks/batch 검증
 * - 유효한 요청 처리
 * - 빈 배열 에러
 * - 30개 초과 에러
 * - 캐시 히트/미스 처리
 * - 개별 종목 실패 시 부분 결과 반환
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// KiwoomStockAPI 모킹 (@/ 경로 alias 사용)
vi.mock('@/lib/kiwoom-stock-api', () => {
  const mockFetchStockDetail = vi.fn()
  return {
    KiwoomStockAPI: vi.fn().mockImplementation(() => ({
      fetchStockDetail: mockFetchStockDetail
    }))
  }
})

// 캐시 모킹
vi.mock('@/lib/cache', () => {
  const mockGet = vi.fn()
  const mockSet = vi.fn()
  return {
    cache: {
      get: mockGet,
      set: mockSet,
      delete: vi.fn(),
      clear: vi.fn(),
      cleanup: vi.fn()
    }
  }
})

import { KiwoomStockAPI } from '@/lib/kiwoom-stock-api'
import { cache } from '@/lib/cache'

// 목업 종목 데이터
const mockStockData1 = {
  symbol: '005930',
  name: '삼성전자',
  price: 85000,
  changeAmount: 1500,
  changePercent: 1.79,
  volume: 15000000,
  marketCap: undefined,
  timestamp: new Date()
}

const mockStockData2 = {
  symbol: '000660',
  name: 'SK하이닉스',
  price: 150000,
  changeAmount: -2000,
  changePercent: -1.31,
  volume: 8000000,
  marketCap: undefined,
  timestamp: new Date()
}

describe('POST /api/stocks/batch (배치 종목 조회 API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.KIWOOM_APP_KEY = 'test-app-key'
    process.env.KIWOOM_SECRET_KEY = 'test-secret-key'
  })

  describe('유효한 요청 처리', () => {
    it('단일 종목을 조회해야 한다', async () => {
      // Arrange: 캐시 미스
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockResolvedValue(mockStockData1)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['005930'] })
      })
      const response = await POST(request)
      const json = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.stocks).toHaveLength(1)
      expect(json.data.stocks[0]).toMatchObject({
        symbol: '005930',
        name: '삼성전자'
      })
      expect(mockAPIInstance.fetchStockDetail).toHaveBeenCalledWith('005930')
    })

    it('여러 종목을 병렬로 조회해야 한다', async () => {
      // Arrange: 캐시 미스
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn()
          .mockResolvedValueOnce(mockStockData1)
          .mockResolvedValueOnce(mockStockData2)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['005930', '000660'] })
      })
      const response = await POST(request)
      const json = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(json.data.stocks).toHaveLength(2)
      expect(json.data.stocks[0].symbol).toBe('005930')
      expect(json.data.stocks[1].symbol).toBe('000660')
      expect(mockAPIInstance.fetchStockDetail).toHaveBeenCalledTimes(2)
    })

    it('캐시된 데이터는 API를 호출하지 않아야 한다', async () => {
      // Arrange: 캐시 히트
      vi.mocked(cache.get).mockImplementation((key) => {
        if (key === 'stock_005930') return mockStockData1
        return null
      })

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockResolvedValue(mockStockData1)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['005930'] })
      })
      const response = await POST(request)

      // Assert: API 미호출
      expect(mockAPIInstance.fetchStockDetail).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })

    it('캐시와 API를 혼합해서 조회해야 한다', async () => {
      // Arrange: 005930은 캐시 히트, 000660은 캐시 미스
      vi.mocked(cache.get).mockImplementation((key) => {
        if (key === 'stock_005930') return mockStockData1
        return null
      })

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockResolvedValue(mockStockData2)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['005930', '000660'] })
      })
      const response = await POST(request)
      const json = await response.json()

      // Assert: 000660만 API 호출
      expect(mockAPIInstance.fetchStockDetail).toHaveBeenCalledTimes(1)
      expect(mockAPIInstance.fetchStockDetail).toHaveBeenCalledWith('000660')
      expect(response.status).toBe(200)
      expect(json.data.stocks).toHaveLength(2)
    })
  })

  describe('에러 처리', () => {
    it('빈 배열이면 400 에러를 반환해야 한다', async () => {
      // Act
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: [] })
      })
      const response = await POST(request)
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toContain('symbols')
    })

    it('30개 초과하면 400 에러를 반환해야 한다', async () => {
      // Act: 31개 종목 요청
      const { POST } = await import('../route')
      const symbols = Array.from({ length: 31 }, (_, i) => `00000${i}`)
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols })
      })
      const response = await POST(request)
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toContain('30')
    })

    it('symbols 필드가 없으면 400 에러를 반환해야 한다', async () => {
      // Act
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({})
      })
      const response = await POST(request)
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('개별 종목 실패 시 해당 종목을 건너뛰고 부분 결과를 반환해야 한다', async () => {
      // Arrange: 캐시 미스
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn()
          .mockResolvedValueOnce(mockStockData1) // 005930 성공
          .mockRejectedValueOnce(new Error('Network error')) // 000660 실패
          .mockResolvedValueOnce(mockStockData2) // 035420 성공
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['005930', '000660', '035420'] })
      })
      const response = await POST(request)
      const json = await response.json()

      // Assert: 2개만 반환 (000660은 실패로 건너뜀)
      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.stocks).toHaveLength(2)
      expect(json.data.stocks[0].symbol).toBe('005930')
      expect(json.data.stocks[1].symbol).toBe('035420')
    })
  })

  describe('캐시 저장', () => {
    it('조회된 데이터를 15초 TTL로 캐시해야 한다', async () => {
      // Arrange: 캐시 미스
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockResolvedValue(mockStockData1)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { POST } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['005930'] })
      })
      await POST(request)

      // Assert: 15초 TTL로 캐시 저장 (SPEC-POLL-004)
      expect(cache.set).toHaveBeenCalledWith(
        'stock_005930',
        expect.objectContaining({
          symbol: '005930',
          name: '삼성전자'
        }),
        15
      )
    })
  })
})
