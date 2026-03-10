/**
 * 키움증권 REST API 주식 데이터 조회 테스트
 * REQ-002: 종목 리스트 조회 전환 (ka10099)
 * REQ-003: 개별 종목 시세 조회 전환 (ka10001)
 * REQ-004: 데이터 완전성 보장
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KiwoomStockAPI } from '../kiwoom-stock-api'
import KiwoomTokenManager from '../kiwoom-token-manager'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

vi.mock('../kiwoom-token-manager', () => {
  const mockGetAccessToken = vi.fn()
  return {
    default: {
      getInstance: vi.fn(() => ({
        getAccessToken: mockGetAccessToken
      })),
      getAccessToken: mockGetAccessToken,
      // isTokenError: 실제 구현 재현 ([8005] 감지, [8001] 제외)
      isTokenError: (error: unknown): boolean => {
        if (!error || !(error instanceof Error)) return false
        const msg = error.message
        if (msg.includes('[8001]')) return false
        if (msg.includes('[8005]')) return true
        return false
      }
    }
  }
})

import axios from 'axios'

describe('KiwoomStockAPI', () => {
  let stockAPI: KiwoomStockAPI
  const mockAccessToken = 'test-access-token'

  beforeEach(() => {
    process.env.KIWOOM_APP_KEY = 'test-app-key'
    process.env.KIWOOM_SECRET_KEY = 'test-secret-key'

    const mockTokenManager = {
      getAccessToken: vi.fn().mockResolvedValue(mockAccessToken)
    }
    vi.spyOn(KiwoomTokenManager, 'getInstance').mockReturnValue(mockTokenManager as any)

    stockAPI = new KiwoomStockAPI()
    vi.mocked(axios.post).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    delete process.env.KIWOOM_APP_KEY
    delete process.env.KIWOOM_SECRET_KEY
  })

  describe('전체 종목 리스트 조회 (fetchStockList)', () => {
    it('KOSPI 종목 리스트를 성공적으로 조회해야 한다', async () => {
      // Arrange: ka10099 응답 형식 (list 배열, code/name 필드)
      const mockResponse = {
        data: {
          return_code: 0,
          return_msg: '정상적으로 처리되었습니다',
          list: [
            { code: '005930', name: '삼성전자', marketCode: '0', kind: 'A' },
            { code: '000660', name: 'SK하이닉스', marketCode: '0', kind: 'A' }
          ]
        }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse as any)

      // Act
      const stocks = await stockAPI.fetchStockList('KOSPI')

      // Assert
      expect(stocks).toHaveLength(2)
      expect(stocks[0]).toEqual({
        symbol: '005930',
        name: '삼성전자',
        market: 'KOSPI',
        search_keywords: ['005930', '삼성전자', 'kospi']
      })
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.kiwoom.com/api/dostk/stkinfo',
        { mrkt_tp: '0' }, // KOSPI 코드
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-id': 'ka10099',
            'Authorization': `Bearer ${mockAccessToken}`
          })
        })
      )
    })

    it('KOSDAQ 종목 리스트를 성공적으로 조회해야 한다', async () => {
      // Arrange
      const mockResponse = {
        data: {
          return_code: 0,
          list: [
            { code: '066570', name: 'LG전자', marketCode: '10', kind: 'A' }
          ]
        }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse as any)

      // Act
      const stocks = await stockAPI.fetchStockList('KOSDAQ')

      // Assert
      expect(stocks).toHaveLength(1)
      expect(stocks[0].market).toBe('KOSDAQ')
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        { mrkt_tp: '10' }, // KOSDAQ 코드
        expect.anything()
      )
    })

    it('전체 종목(KOSPI+KOSDAQ) 조회 시 모든 종목을 반환해야 한다', async () => {
      // Arrange
      const mockKOSPIResponse = {
        data: {
          return_code: 0,
          list: [{ code: '005930', name: '삼성전자', marketCode: '0', kind: 'A' }]
        }
      }
      const mockKOSDAQResponse = {
        data: {
          return_code: 0,
          list: [{ code: '066570', name: 'LG전자', marketCode: '10', kind: 'A' }]
        }
      }
      vi.mocked(axios.post)
        .mockResolvedValueOnce(mockKOSPIResponse)
        .mockResolvedValueOnce(mockKOSDAQResponse)

      // Act
      const stocks = await stockAPI.fetchStockList('ALL')

      // Assert
      expect(stocks).toHaveLength(2)
      expect(stocks[0].market).toBe('KOSPI')
      expect(stocks[1].market).toBe('KOSDAQ')
    })

    it('API 응답 에러 시 예외를 발생시켜야 한다', async () => {
      // Arrange
      const mockErrorResponse = {
        data: {
          return_code: -1,
          return_msg: 'Invalid token'
        }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockErrorResponse as any)

      // Act & Assert
      await expect(stockAPI.fetchStockList('KOSPI')).rejects.toThrow('종목 리스트 조회 실패: Invalid token')
    })
  })

  describe('개별 종목 시세 조회 (fetchStockDetail)', () => {
    it('종목 시세를 성공적으로 조회해야 한다', async () => {
      // Arrange: ka10001 응답 형식 (최상위 필드, 부호 포함 문자열)
      const mockResponse = {
        data: {
          return_code: 0,
          return_msg: '정상적으로 처리되었습니다',
          stk_cd: '005930',
          stk_nm: '삼성전자',      // 종목명
          cur_prc: '+85000',      // 현재가
          pred_pre: '+1500',      // 전일대비
          flu_rt: '+1.79',        // 등락률
          trde_qty: '15000000',   // 거래량
          mac: '509000000',       // 시가총액 (백만원)
          flo_stk: '6000000',     // 유동주식수
          open_pric: '+84000',    // 시가
          high_pric: '+86000',    // 고가
          low_pric: '+83500',     // 저가
          base_pric: '83500',     // 전일종가 (부호 없음)
          oyr_hgst: '+95000',     // 52주 최고가
          oyr_lwst: '-65000',     // 52주 최저가 (부호+절대값)
          trde_pre: '+5.00'       // 거래량 전일비율
        }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse as any)

      // Act
      const stockDetail = await stockAPI.fetchStockDetail('005930')

      // Assert: 부호 제거 및 절대값 확인
      expect(stockDetail).toEqual({
        symbol: '005930',
        name: '삼성전자',
        price: 85000,
        changeAmount: 1500,
        changePercent: 1.79,
        volume: 15000000,
        marketCap: 509000000,
        tradingValue: 85000 * 15000000, // price × volume 계산값
        sharesOutstanding: 6000000,
        volumeRatio: 5.00,
        open: 84000,
        high: 86000,
        low: 83500,
        previousClose: 83500,
        high52w: 95000,
        low52w: 65000 // 음수 부호 제거 → 절대값
      })

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.kiwoom.com/api/dostk/stkinfo',
        { stk_cd: '005930' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-id': 'ka10001'
          })
        })
      )
    })

    it('API 응답에 누락된 필드가 있으면 null을 반환해야 한다 (REQ-004)', async () => {
      // Arrange: 일부 필드만 있는 응답
      const mockResponse = {
        data: {
          return_code: 0,
          cur_prc: '+85000'
          // 다른 필드 누락
        }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse as any)

      // Act
      const stockDetail = await stockAPI.fetchStockDetail('005930')

      // Assert: 있는 필드는 값, 없는 필드는 null
      expect(stockDetail.price).toBe(85000)
      expect(stockDetail.changeAmount).toBeNull()
      expect(stockDetail.high52w).toBeNull()
      expect(stockDetail.tradingValue).toBeNull() // volume 없으면 계산 불가
    })

    it('종목코드가 없으면 에러를 발생시켜야 한다', async () => {
      await expect(stockAPI.fetchStockDetail('')).rejects.toThrow('종목코드는 필수입니다')
    })

    it('return_code가 0이 아니면 에러를 발생시켜야 한다', async () => {
      const mockResponse = {
        data: {
          return_code: 2,
          return_msg: '잘못된 종목코드입니다'
        }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse as any)

      await expect(stockAPI.fetchStockDetail('999999')).rejects.toThrow('종목 시세 조회 실패: 잘못된 종목코드입니다')
    })
  })

  describe('토큰 재시도 래퍼 (requestWithTokenRetry)', () => {
    it('[8005] 에러 시 토큰 무효화 후 1회 재시도해야 한다', async () => {
      // Arrange: 첫 번째 axios.post는 [8005] 에러, 두 번째는 성공
      const tokenError = new Error('토큰이 유효하지 않습니다[8005]')
      const successResponse = {
        data: {
          return_code: 0,
          stk_cd: '005930',
          stk_nm: '삼성전자',
          cur_prc: '+85000',
          trde_qty: '1000000'
        }
      }
      vi.mocked(axios.post)
        .mockRejectedValueOnce(tokenError)
        .mockResolvedValueOnce(successResponse as any)

      const mockInvalidateToken = vi.fn()
      vi.spyOn(KiwoomTokenManager, 'getInstance')
        .mockReturnValueOnce({
          getAccessToken: vi.fn().mockResolvedValue('first-token'),
          invalidateToken: mockInvalidateToken
        } as any)
        .mockReturnValueOnce({
          getAccessToken: vi.fn().mockResolvedValue('new-token'),
          invalidateToken: mockInvalidateToken
        } as any)
        .mockReturnValue({
          getAccessToken: vi.fn().mockResolvedValue('new-token'),
          invalidateToken: mockInvalidateToken
        } as any)

      // Act
      const result = await stockAPI.fetchStockDetail('005930')

      // Assert: 토큰 무효화 후 재시도
      expect(mockInvalidateToken).toHaveBeenCalledTimes(1)
      expect(axios.post).toHaveBeenCalledTimes(2)
      expect(result.symbol).toBe('005930')
    })

    it('재시도 후에도 실패하면 에러를 throw해야 한다', async () => {
      // Arrange: 첫 번째와 두 번째 모두 [8005] 에러
      const tokenError = new Error('토큰이 유효하지 않습니다[8005]')
      vi.mocked(axios.post)
        .mockRejectedValueOnce(tokenError)
        .mockRejectedValueOnce(tokenError)

      const mockInvalidateToken = vi.fn()
      vi.spyOn(KiwoomTokenManager, 'getInstance').mockReturnValue({
        getAccessToken: vi.fn().mockResolvedValue('test-token'),
        invalidateToken: mockInvalidateToken
      } as any)

      // Act & Assert
      await expect(stockAPI.fetchStockDetail('005930')).rejects.toThrow('[8005]')
      expect(mockInvalidateToken).toHaveBeenCalledTimes(1)
    })

    it('비토큰 에러는 즉시 throw하고 재시도하지 않아야 한다', async () => {
      // Arrange: 네트워크 에러 (재시도 없어야 함)
      const networkError = new Error('Network Error')
      vi.mocked(axios.post).mockRejectedValueOnce(networkError)

      const mockInvalidateToken = vi.fn()
      vi.spyOn(KiwoomTokenManager, 'getInstance').mockReturnValue({
        getAccessToken: vi.fn().mockResolvedValue('test-token'),
        invalidateToken: mockInvalidateToken
      } as any)

      // Act & Assert
      await expect(stockAPI.fetchStockDetail('005930')).rejects.toThrow('Network Error')
      // 토큰 무효화 없어야 함
      expect(mockInvalidateToken).not.toHaveBeenCalled()
      // axios.post 1회만 호출
      expect(axios.post).toHaveBeenCalledTimes(1)
    })
  })

  describe('종목 검색 (searchStocks)', () => {
    it('종목명으로 검색할 수 있어야 한다', () => {
      const stocks = [
        { symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: ['005930', '삼성전자', 'kospi'] },
        { symbol: '005935', name: '삼성전자우', market: 'KOSPI', search_keywords: ['005935', '삼성전자우', 'kospi'] },
        { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI', search_keywords: ['000660', 'SK하이닉스', 'kospi'] }
      ]

      const results = stockAPI.searchStocks('삼성전자', stocks)

      expect(results).toHaveLength(2)
      expect(results[0].symbol).toBe('005930')
      expect(results[1].symbol).toBe('005935')
    })

    it('종목코드로 검색할 수 있어야 한다', () => {
      const stocks = [
        { symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: ['005930', '삼성전자', 'kospi'] }
      ]

      const results = stockAPI.searchStocks('005930', stocks)

      expect(results).toHaveLength(1)
      expect(results[0].symbol).toBe('005930')
    })

    it('검색 결과가 점수순으로 정렬되어야 한다', () => {
      const stocks = [
        { symbol: '005930', name: '삼성전자', market: 'KOSPI', search_keywords: ['005930', '삼성전자', 'kospi'] },
        { symbol: '005935', name: '삼성전자우', market: 'KOSDAQ', search_keywords: ['005935', '삼성전자우', 'kosdaq'] }
      ]

      const results = stockAPI.searchStocks('005930', stocks)

      expect(results[0].symbol).toBe('005930')
    })
  })
})
