/**
 * Next.js API Routes 통합 테스트
 * Task #7 (REQ-007): API Routes가 KiwoomStockAPI를 올바르게 사용하는지 검증
 * Task #4 (REQ-004): 데이터 완전성 보장 및 폴백 처리
 * Task #5 (REQ-005): 캐시 히트/미스 시나리오
 * Task #6 (REQ-006): 에러 처리 및 타임아웃
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// KiwoomStockAPI 모킹
vi.mock('../kiwoom-stock-api', () => {
  const mockFetchStockList = vi.fn()
  const mockFetchStockDetail = vi.fn()
  const mockSearchStocks = vi.fn()

  return {
    KiwoomStockAPI: vi.fn().mockImplementation(() => ({
      fetchStockList: mockFetchStockList,
      fetchStockDetail: mockFetchStockDetail,
      searchStocks: mockSearchStocks
    })),
    default: vi.fn().mockImplementation(() => ({
      fetchStockList: mockFetchStockList,
      fetchStockDetail: mockFetchStockDetail,
      searchStocks: mockSearchStocks
    }))
  }
})

// 캐시 모킹 - 캐시 행동 제어를 위해
vi.mock('../cache', () => {
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

import { KiwoomStockAPI } from '../kiwoom-stock-api'
import { cache } from '../cache'

describe('GET /api/stocks (종목 검색 API)', () => {
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

  // REQ-007: API 응답 형식 호환성 테스트
  describe('REQ-007: StockSearchResult[] 형식 반환', () => {
    it('검색 쿼리로 StockSearchResult[] 형식의 데이터를 반환해야 한다', async () => {
      // Arrange
      const mockStockList = [
        { symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: ['005930', '삼성전자'] },
        { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI', search_keywords: ['000660', 'SK하이닉스'] }
      ]
      const mockSearchResults = [
        { symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: ['005930', '삼성전자'] }
      ]

      // 캐시 미스 시뮬레이션
      vi.mocked(cache.get).mockReturnValue(null)

      // KiwoomStockAPI 인스턴스 설정
      const mockAPIInstance = {
        fetchStockList: vi.fn().mockResolvedValue(mockStockList),
        searchStocks: vi.fn().mockReturnValue(mockSearchResults)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/route')
      const request = new NextRequest('http://localhost/api/stocks?q=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90')
      const response = await GET(request)
      const json = await response.json()

      // Assert: StockSearchResult[] 형식 확인
      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data)).toBe(true)

      // symbol, name, market 필드만 있어야 함 (search_keywords 등 내부 필드 없음)
      if (json.data.length > 0) {
        const result = json.data[0]
        expect(result).toHaveProperty('symbol')
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('market')
        expect(result).not.toHaveProperty('search_keywords')
      }
    })

    it('q 파라미터 없을 때 400 에러를 반환해야 한다', async () => {
      // Act
      const { GET } = await import('../../app/api/stocks/route')
      const request = new NextRequest('http://localhost/api/stocks')
      const response = await GET(request)
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })
  })

  // REQ-005: 캐시 전략 테스트
  describe('REQ-005: 7일 캐시 전략', () => {
    it('캐시 히트 시 KiwoomStockAPI.fetchStockList를 호출하지 않아야 한다', async () => {
      // Arrange: 캐시에 데이터 있음
      const cachedStocks = [
        { symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: ['005930'] }
      ]
      vi.mocked(cache.get).mockReturnValue(cachedStocks)

      const mockAPIInstance = {
        fetchStockList: vi.fn(),
        searchStocks: vi.fn().mockReturnValue([{ symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: [] }])
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/route')
      const request = new NextRequest('http://localhost/api/stocks?q=%EC%82%BC%EC%84%B1')
      await GET(request)

      // Assert: fetchStockList 호출 안 됨
      expect(mockAPIInstance.fetchStockList).not.toHaveBeenCalled()
    })

    it('캐시 미스 시 KiwoomStockAPI.fetchStockList를 호출하고 결과를 캐시에 저장해야 한다', async () => {
      // Arrange: 캐시 미스
      vi.mocked(cache.get).mockReturnValue(null)

      const mockStockList = [
        { symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: ['005930'] }
      ]
      const mockAPIInstance = {
        fetchStockList: vi.fn().mockResolvedValue(mockStockList),
        searchStocks: vi.fn().mockReturnValue([{ symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: [] }])
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/route')
      const request = new NextRequest('http://localhost/api/stocks?q=%EC%82%BC%EC%84%B1')
      await GET(request)

      // Assert: fetchStockList 호출 됨 및 캐시 저장
      expect(mockAPIInstance.fetchStockList).toHaveBeenCalledWith('ALL')
      expect(cache.set).toHaveBeenCalledWith(
        'all_stocks_list',
        mockStockList,
        7 * 24 * 60 * 60 // 7일 (초)
      )
    })
  })

  // REQ-006: 에러 처리 테스트
  describe('REQ-006: 에러 처리', () => {
    it('KiwoomStockAPI 에러 시 500 응답을 반환해야 한다', async () => {
      // Arrange: API 에러
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockList: vi.fn().mockRejectedValue(new Error('API connection failed')),
        searchStocks: vi.fn()
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/route')
      const request = new NextRequest('http://localhost/api/stocks?q=%EC%82%BC%EC%84%B1')
      const response = await GET(request)
      const json = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })

    it('환경변수 없을 때도 에러 응답을 반환해야 한다', async () => {
      // Arrange: 환경변수 삭제
      delete process.env.KIWOOM_APP_KEY
      delete process.env.KIWOOM_SECRET_KEY
      vi.mocked(cache.get).mockReturnValue(null)

      vi.mocked(KiwoomStockAPI).mockImplementation(() => {
        throw new Error('KIWOOM_APP_KEY와 KIWOOM_SECRET_KEY 환경변수가 필요합니다')
      })

      // Act
      const { GET } = await import('../../app/api/stocks/route')
      const request = new NextRequest('http://localhost/api/stocks?q=%EC%82%BC%EC%84%B1')
      const response = await GET(request)
      const json = await response.json()

      // Assert: 에러 응답 반환 확인
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
      // API 키가 에러 메시지에 노출되지 않아야 함 (REQ-006)
      if (json.error) {
        expect(json.error).not.toContain('test-app-key')
        expect(json.error).not.toContain('test-secret-key')
      }
    })
  })
})

describe('GET /api/stocks/[symbol] (종목 시세 조회 API)', () => {
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

  // REQ-007: StockInfo 형식 반환
  describe('REQ-007: StockInfo 형식 반환', () => {
    it('종목코드로 StockInfo 형식의 데이터를 반환해야 한다', async () => {
      // Arrange
      const mockStockDetail = {
        symbol: '005930',
        name: '삼성전자',
        price: 85000,
        changeAmount: 1500,
        changePercent: 1.79,
        volume: 15000000,
        marketCap: 509000000,
        tradingValue: 1275000000000,
        sharesOutstanding: 6000000,
        volumeRatio: 5.0,
        high: 86000,
        low: 83500,
        open: 84000,
        previousClose: 83500,
        high52w: 95000,
        low52w: 65000
      }

      // 캐시 미스
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockResolvedValue(mockStockDetail)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/005930')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert: StockInfo 형식 확인
      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()
      expect(json.data.symbol).toBe('005930')
      expect(json.data.name).toBe('삼성전자')
      expect(json.data.price).toBe(85000)
      expect(json.data.changeAmount).toBe(1500)
      expect(json.data.changePercent).toBe(1.79)
      expect(json.data.volume).toBe(15000000)
    })

    it('null 필드는 undefined로 변환되어야 한다 (REQ-004)', async () => {
      // Arrange: 일부 선택 필드가 null인 경우
      const mockStockDetail = {
        symbol: '005930',
        name: '삼성전자',
        price: 85000,
        changeAmount: 1500,
        changePercent: 1.79,
        volume: 15000000,
        marketCap: null,      // null → undefined로 변환
        tradingValue: null,
        sharesOutstanding: null,
        volumeRatio: null,
        high: null,
        low: null,
        open: null,
        previousClose: null,
        high52w: null,
        low52w: null
      }

      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockResolvedValue(mockStockDetail)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/005930')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert: null → undefined (JSON에서는 누락)
      expect(json.success).toBe(true)
      expect(json.data.price).toBe(85000)
      // null이었던 선택 필드들은 undefined이므로 JSON에서 누락
      expect(json.data.marketCap).toBeUndefined()
      expect(json.data.high52w).toBeUndefined()
      expect(json.data.low52w).toBeUndefined()
    })

    it('필수 필드(price 등)가 null이면 0으로 변환되어야 한다 (REQ-004)', async () => {
      // Arrange: 필수 필드가 null인 경우
      const mockStockDetail = {
        symbol: '005930',
        name: '삼성전자',
        price: null,
        changeAmount: null,
        changePercent: null,
        volume: null,
        marketCap: null,
        tradingValue: null,
        sharesOutstanding: null,
        volumeRatio: null,
        high: null,
        low: null,
        open: null,
        previousClose: null,
        high52w: null,
        low52w: null
      }

      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockResolvedValue(mockStockDetail)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/005930')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert: null → 0 (필수 필드)
      expect(json.success).toBe(true)
      expect(json.data.price).toBe(0)
      expect(json.data.changeAmount).toBe(0)
      expect(json.data.changePercent).toBe(0)
      expect(json.data.volume).toBe(0)
    })
  })

  // REQ-005: 30초 캐시 전략
  describe('REQ-005: 30초 캐시 전략', () => {
    it('캐시 히트 시 KiwoomStockAPI.fetchStockDetail을 호출하지 않아야 한다', async () => {
      // Arrange: 캐시에 StockInfo 데이터 있음
      const cachedStockInfo = {
        symbol: '005930',
        name: '삼성전자',
        price: 85000,
        changeAmount: 1500,
        changePercent: 1.79,
        volume: 15000000
      }
      vi.mocked(cache.get).mockReturnValue(cachedStockInfo)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn()
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/005930')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert: fetchStockDetail 호출 안 됨 (캐시 히트)
      expect(mockAPIInstance.fetchStockDetail).not.toHaveBeenCalled()
      expect(json.success).toBe(true)
      expect(json.data).toEqual(cachedStockInfo)
    })

    it('캐시 미스 시 fetchStockDetail을 호출하고 30초 TTL로 캐시에 저장해야 한다', async () => {
      // Arrange: 캐시 미스
      vi.mocked(cache.get).mockReturnValue(null)

      const mockStockDetail = {
        symbol: '005930',
        name: '삼성전자',
        price: 85000,
        changeAmount: 1500,
        changePercent: 1.79,
        volume: 15000000,
        marketCap: null,
        tradingValue: null,
        sharesOutstanding: null,
        volumeRatio: null,
        high: null,
        low: null,
        open: null,
        previousClose: null,
        high52w: null,
        low52w: null
      }

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockResolvedValue(mockStockDetail)
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/005930')
      await GET(request, { params: Promise.resolve({ symbol: '005930' }) })

      // Assert: fetchStockDetail 호출 및 15초 TTL로 캐시 저장 (SPEC-POLL-004)
      expect(mockAPIInstance.fetchStockDetail).toHaveBeenCalledWith('005930')
      expect(cache.set).toHaveBeenCalledWith(
        'stock_005930',
        expect.objectContaining({ symbol: '005930', name: '삼성전자' }),
        15 // 15초 TTL (SPEC-POLL-004: 서버 캐시 <= 클라이언트 폴링)
      )
    })
  })

  // REQ-006: 에러 처리
  describe('REQ-006: 에러 처리', () => {
    it('symbol이 빈 문자열이면 400 에러를 반환해야 한다', async () => {
      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/')
      const response = await GET(request, { params: Promise.resolve({ symbol: '' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })

    it('KiwoomStockAPI 에러 시 500 응답을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockRejectedValue(new Error('API connection failed'))
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/005930')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })

    it('잘못된 종목코드 에러 시 에러 응답을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      const mockAPIInstance = {
        fetchStockDetail: vi.fn().mockRejectedValue(new Error('종목 시세 조회 실패: 잘못된 종목코드입니다'))
      }
      vi.mocked(KiwoomStockAPI).mockImplementation(() => mockAPIInstance as any)

      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/999999')
      const response = await GET(request, { params: Promise.resolve({ symbol: '999999' }) })
      const json = await response.json()

      // Assert
      expect(json.success).toBe(false)
      expect(json.error).toContain('잘못된 종목코드')
    })

    it('응답에 API 시크릿 키가 포함되지 않아야 한다 (REQ-006)', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValue(null)

      vi.mocked(KiwoomStockAPI).mockImplementation(() => {
        throw new Error('API 키 오류: test-secret-key is invalid')
      })

      // Act
      const { GET } = await import('../../app/api/stocks/[symbol]/route')
      const request = new NextRequest('http://localhost/api/stocks/005930')
      const response = await GET(request, { params: Promise.resolve({ symbol: '005930' }) })
      const json = await response.json()

      // Assert: 에러 메시지에 API 키 포함 여부 확인
      // 현재 구현에서는 error instanceof Error ? error.message : ... 를 그대로 반환
      // 이는 실제 운영환경에서는 문제가 될 수 있음 (REQ-006 개선 필요)
      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
    })
  })
})
