/**
 * 차트 API Route 테스트 (SPEC-CHART-001)
 * TAG-003: GET /api/stocks/[symbol]/chart 검증
 * - period 파라미터별 응답 (daily/weekly)
 * - 캐시 히트/미스 처리
 * - TTL 검증 (daily: 1시간, weekly: 1일)
 * - 유효하지 않은 파라미터 처리
 * - 타임아웃 처리 (2초)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// KiwoomStockAPI 모킹 (@/ 경로 alias 사용 - route.ts와 동일한 경로)
vi.mock('@/lib/kiwoom-stock-api', () => {
  const mockFetchChart = vi.fn()

  return {
    KiwoomStockAPI: vi.fn().mockImplementation(() => ({
      fetchChart: mockFetchChart
    })),
    default: vi.fn().mockImplementation(() => ({
      fetchChart: mockFetchChart
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

// 목업 차트 데이터
const mockDailyChartData = {
  symbol: '005930',
  period: 'daily' as const,
  candles: [
    { date: '2024-01-03', open: 71500, high: 73000, low: 71000, close: 72000, volume: 12000000 },
    { date: '2024-01-02', open: 70000, high: 72000, low: 69500, close: 71500, volume: 11000000 },
    { date: '2024-01-01', open: 69000, high: 70500, low: 68500, close: 70000, volume: 10000000 }
  ]
}

const mockWeeklyChartData = {
  symbol: '005930',
  period: 'weekly' as const,
  candles: [
    { date: '2023-12-29', open: 68000, high: 72000, low: 67500, close: 71000, volume: 55000000 },
    { date: '2023-12-22', open: 65000, high: 69000, low: 64500, close: 68000, volume: 48000000 }
  ]
}

const mockMonthlyChartData = {
  symbol: '005930',
  period: 'monthly' as const,
  candles: [
    { date: '2023-12-01', open: 65000, high: 75000, low: 64000, close: 72000, volume: 220000000 },
    { date: '2023-11-01', open: 62000, high: 67000, low: 61000, close: 65000, volume: 195000000 }
  ]
}

describe('GET /api/stocks/[symbol]/chart (차트 데이터 조회 API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.KIWOOM_APP_KEY = 'test-app-key'
    process.env.KIWOOM_SECRET_KEY = 'test-secret-key'
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.KIWOOM_APP_KEY
    delete process.env.KIWOOM_SECRET_KEY
  })

  describe('period=daily 조회', () => {
    it('period=daily로 일봉 ChartData를 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockDailyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=daily')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()
      expect(json.data.symbol).toBe('005930')
      expect(json.data.period).toBe('daily')
      expect(Array.isArray(json.data.candles)).toBe(true)
    })

    it('daily 조회 시 ka10081로 fetchChart를 호출해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockDailyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=daily&from=20240101&to=20240103')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert
      expect(mockAPIInstance.fetchChart).toHaveBeenCalledWith(
        '005930',
        'ka10081',
        expect.objectContaining({
          from: '20240101',
          to: '20240103'
        })
      )
    })
  })

  describe('period=weekly 조회', () => {
    it('period=weekly로 주봉 ChartData를 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockWeeklyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=weekly')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.period).toBe('weekly')
    })

    it('weekly 조회 시 ka10082로 fetchChart를 호출해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockWeeklyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=weekly')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert
      expect(mockAPIInstance.fetchChart).toHaveBeenCalledWith(
        '005930',
        'ka10082',
        expect.any(Object)
      )
    })
  })

  describe('캐시 처리', () => {
    it('캐시 히트 시 캐시 데이터를 반환하고 API 호출하지 않아야 한다', async () => {
      // Arrange: 캐시에 데이터 있음
      vi.mocked(cache.get).mockReturnValue(mockDailyChartData)

      const mockAPIInstance = {
        fetchChart: vi.fn()
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=daily')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(mockAPIInstance.fetchChart).not.toHaveBeenCalled()
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockDailyChartData)
    })

    it('캐시 미스 시 API를 호출하고 결과를 캐시에 저장해야 한다', async () => {
      // Arrange: 캐시 미스
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockDailyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=daily')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: API 호출 및 캐시 저장 확인
      expect(mockAPIInstance.fetchChart).toHaveBeenCalled()
      expect(cache.set).toHaveBeenCalled()
    })

    it('일봉 캐시 TTL은 3600000ms (1시간)이어야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockDailyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=daily')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: TTL 1시간 = 3600000ms
      expect(cache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        3600000
      )
    })

    it('주봉 캐시 TTL은 86400000ms (1일)이어야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockWeeklyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=weekly')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: TTL 1일 = 86400000ms
      expect(cache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        86400000
      )
    })

    it('캐시 키는 symbol, period, from, to를 포함해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockDailyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=daily&from=20240101&to=20240103')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: 캐시 키에 필요한 정보 포함
      const cacheGetCall = vi.mocked(cache.get).mock.calls[0]
      const cacheKey = cacheGetCall[0] as string
      expect(cacheKey).toContain('005930')
      expect(cacheKey).toContain('daily')
    })
  })

  describe('period=monthly 조회 (SPEC-CHART-002)', () => {
    it('period=monthly로 월봉 ChartData를 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockMonthlyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=monthly')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.period).toBe('monthly')
    })

    it('monthly 조회 시 ka10083으로 fetchChart를 호출해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockMonthlyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=monthly')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: 월봉은 ka10083 TR 코드 사용
      expect(mockAPIInstance.fetchChart).toHaveBeenCalledWith(
        '005930',
        'ka10083',
        expect.any(Object)
      )
    })

    it('월봉 캐시 TTL은 86400000ms (1일)이어야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockMonthlyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=monthly')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: 월봉 TTL = 1일 = 86400000ms
      expect(cache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        86400000
      )
    })
  })

  describe('period=minute 조회 (SPEC-CHART-003)', () => {
    const mockMinuteChartData = {
      symbol: '005930',
      period: 'minute' as const,
      candles: [
        { date: '2026-03-10T09:01:00', open: 71000, high: 71500, low: 70800, close: 71200, volume: 500000 },
        { date: '2026-03-10T09:02:00', open: 71200, high: 71800, low: 71000, close: 71600, volume: 450000 },
      ]
    }

    it('period=minute으로 분봉 ChartData를 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockMinuteChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=minute&from=20260310&tic_scope=1')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.period).toBe('minute')
    })

    it('minute 조회 시 ka10080으로 fetchChart를 호출해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockMinuteChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=minute&from=20260310&tic_scope=5')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: ka10080 TR 코드와 ticScope 파라미터 전달 확인
      expect(mockAPIInstance.fetchChart).toHaveBeenCalledWith(
        '005930',
        'ka10080',
        expect.objectContaining({ ticScope: '5' })
      )
    })

    it('tic_scope가 없으면 기본값 "1"을 사용해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockMinuteChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=minute&from=20260310')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: 기본값 '1' 전달
      expect(mockAPIInstance.fetchChart).toHaveBeenCalledWith(
        '005930',
        'ka10080',
        expect.objectContaining({ ticScope: '1' })
      )
    })

    it('유효하지 않은 tic_scope는 400을 반환해야 한다', async () => {
      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=minute&tic_scope=7')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('분봉 캐시 TTL은 300000ms (5분)이어야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockMinuteChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=minute&from=20260310')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: TTL 5분 = 300000ms
      expect(cache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        300000
      )
    })
  })

  describe('유효성 검사', () => {
    it('유효하지 않은 period 파라미터 (monthly가 아닌 다른 값)는 400을 반환해야 한다', async () => {
      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=invalid')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })

    it('monthly는 유효한 period 파라미터로 인식해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockResolvedValue(mockMonthlyChartData)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=monthly')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: monthly는 400이 아닌 200 반환
      expect(response.status).toBe(200)
    })

    it('period 파라미터 없이 요청하면 400을 반환해야 한다', async () => {
      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('symbol이 빈 문자열이면 400을 반환해야 한다', async () => {
      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks//chart?period=daily')
      const response = await GET(request, { params: Promise.resolve({ symbol: '' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })
  })

  describe('에러 처리', () => {
    it('API 에러 시 500 응답을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchChart: vi.fn().mockRejectedValue(new Error('API connection failed'))
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=daily')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })

    it('API 타임아웃 (2초) 초과 시 에러 응답을 반환해야 한다', async () => {
      // Arrange: never resolve (타임아웃 유도)
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        // 절대 resolve되지 않는 Promise - 라우트의 2초 타임아웃이 먼저 발동됨
        fetchChart: vi.fn().mockReturnValue(new Promise(() => {}))
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../route')
      const request = new NextRequest('http://localhost/api/stocks/005930/chart?period=daily')

      const startTime = Date.now()
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const elapsed = Date.now() - startTime
      const json = await response.json()

      // Assert: 2초~3초 사이에 응답 + 에러 반환
      expect(elapsed).toBeGreaterThanOrEqual(1900)
      expect(elapsed).toBeLessThan(3000)
      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
    }, 5000)
  })
})
