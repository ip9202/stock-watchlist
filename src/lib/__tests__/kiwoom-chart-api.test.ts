/**
 * 키움증권 차트 API 테스트 (SPEC-CHART-001)
 * TAG-002: fetchChart() 기능 검증
 * - 일봉 차트 조회 (ka10081)
 * - 주봉 차트 조회 (ka10082)
 * - 페이지네이션 자동 처리 (cont-yn: Y/N, next-key 헤더)
 * - 최대 5페이지 제한
 * - 에러 처리
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
      getAccessToken: mockGetAccessToken
    }
  }
})

import axios from 'axios'

// 차트 API 응답 헬퍼: 일봉 데이터 생성
function createDailyChartResponse(candles: Array<{
  dt?: string
  opnprc?: string
  hgprc?: string
  lwprc?: string
  clsprc?: string
  trde_qty?: string
}>, contYn = 'N', nextKey = '') {
  return {
    data: {
      return_code: 0,
      output: candles.map(c => ({
        dt: c.dt || '20240101',
        opnprc: c.opnprc || '70000',
        hgprc: c.hgprc || '72000',
        lwprc: c.lwprc || '69000',
        clsprc: c.clsprc || '71000',
        trde_qty: c.trde_qty || '10000000'
      }))
    },
    headers: {
      'cont-yn': contYn,
      'next-key': nextKey
    }
  }
}

describe('KiwoomStockAPI - fetchChart()', () => {
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

  describe('일봉 차트 조회 (ka10081)', () => {
    it('일봉 차트 데이터를 성공적으로 조회해야 한다', async () => {
      // Arrange
      const mockResponse = createDailyChartResponse([
        { dt: '20240103', opnprc: '71500', hgprc: '73000', lwprc: '71000', clsprc: '72000', trde_qty: '12000000' },
        { dt: '20240102', opnprc: '70000', hgprc: '72000', lwprc: '69500', clsprc: '71500', trde_qty: '11000000' },
        { dt: '20240101', opnprc: '69000', hgprc: '70500', lwprc: '68500', clsprc: '70000', trde_qty: '10000000' }
      ])
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10081', { from: '20240101', to: '20240103' })

      // Assert
      expect(result).toBeDefined()
      expect(result.symbol).toBe('005930')
      expect(result.period).toBe('daily')
      expect(result.candles).toHaveLength(3)

      // 캔들 데이터 구조 확인
      const firstCandle = result.candles[0]
      expect(firstCandle).toHaveProperty('date')
      expect(firstCandle).toHaveProperty('open')
      expect(firstCandle).toHaveProperty('high')
      expect(firstCandle).toHaveProperty('low')
      expect(firstCandle).toHaveProperty('close')
      expect(firstCandle).toHaveProperty('volume')

      // 날짜 형식 확인 (YYYY-MM-DD)
      expect(firstCandle.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('ka10081로 API를 호출해야 한다', async () => {
      // Arrange
      const mockResponse = createDailyChartResponse([
        { dt: '20240101', opnprc: '69000', hgprc: '70500', lwprc: '68500', clsprc: '70000', trde_qty: '10000000' }
      ])
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      await stockAPI.fetchChart('005930', 'ka10081', {})

      // Assert: 차트 엔드포인트와 ka10081 헤더 확인
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.kiwoom.com/api/dostk/chart',
        expect.objectContaining({ stk_cd: '005930' }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-id': 'ka10081',
            'Authorization': `Bearer ${mockAccessToken}`
          })
        })
      )
    })

    it('캔들 데이터 숫자값이 올바르게 파싱되어야 한다', async () => {
      // Arrange: 가격 데이터 검증
      const mockResponse = createDailyChartResponse([
        { dt: '20240103', opnprc: '71500', hgprc: '73000', lwprc: '71000', clsprc: '72000', trde_qty: '12000000' }
      ])
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10081', {})

      // Assert: 숫자 파싱 확인 (parseSignedNumber 미사용 - 차트는 직접 파싱)
      const candle = result.candles[0]
      expect(candle.date).toBe('2024-01-03')
      expect(candle.open).toBe(71500)
      expect(candle.high).toBe(73000)
      expect(candle.low).toBe(71000)
      expect(candle.close).toBe(72000)
      expect(candle.volume).toBe(12000000)
    })
  })

  describe('주봉 차트 조회 (ka10082)', () => {
    it('주봉 차트 데이터를 성공적으로 조회해야 한다', async () => {
      // Arrange
      const mockResponse = createDailyChartResponse([
        { dt: '20231229', opnprc: '68000', hgprc: '72000', lwprc: '67500', clsprc: '71000', trde_qty: '55000000' },
        { dt: '20231222', opnprc: '65000', hgprc: '69000', lwprc: '64500', clsprc: '68000', trde_qty: '48000000' }
      ])
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10082', {})

      // Assert
      expect(result.period).toBe('weekly')
      expect(result.candles).toHaveLength(2)
    })

    it('ka10082로 API를 호출해야 한다', async () => {
      // Arrange
      const mockResponse = createDailyChartResponse([
        { dt: '20231229', opnprc: '68000', hgprc: '72000', lwprc: '67500', clsprc: '71000', trde_qty: '55000000' }
      ])
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      await stockAPI.fetchChart('005930', 'ka10082', {})

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-id': 'ka10082'
          })
        })
      )
    })
  })

  describe('페이지네이션 처리', () => {
    it('cont-yn이 Y이면 next-key로 다음 페이지를 자동으로 조회해야 한다', async () => {
      // Arrange: 첫 번째 응답 - cont-yn: Y (다음 페이지 있음)
      const page1Response = createDailyChartResponse(
        [{ dt: '20240103', opnprc: '71500', hgprc: '73000', lwprc: '71000', clsprc: '72000', trde_qty: '12000000' }],
        'Y',
        'NEXT_KEY_001'
      )
      // 두 번째 응답 - cont-yn: N (마지막 페이지)
      const page2Response = createDailyChartResponse(
        [{ dt: '20240102', opnprc: '70000', hgprc: '72000', lwprc: '69500', clsprc: '71500', trde_qty: '11000000' }],
        'N',
        ''
      )
      vi.mocked(axios.post)
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10081', {})

      // Assert: 두 페이지의 데이터가 합쳐져야 함
      expect(result.candles).toHaveLength(2)
      expect(axios.post).toHaveBeenCalledTimes(2)
    })

    it('두 번째 요청 시 next-key를 요청 본문에 포함해야 한다', async () => {
      // Arrange
      const page1Response = createDailyChartResponse(
        [{ dt: '20240103' }],
        'Y',
        'NEXT_KEY_001'
      )
      const page2Response = createDailyChartResponse(
        [{ dt: '20240102' }],
        'N',
        ''
      )
      vi.mocked(axios.post)
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response)

      // Act
      await stockAPI.fetchChart('005930', 'ka10081', {})

      // Assert: 두 번째 호출 시 next-key 포함 확인
      const secondCall = vi.mocked(axios.post).mock.calls[1]
      expect(secondCall[1]).toHaveProperty('next_key', 'NEXT_KEY_001')
    })

    it('최대 5페이지까지만 조회해야 한다', async () => {
      // Arrange: 계속 cont-yn: Y 반환 (무한 페이지)
      const pageResponse = createDailyChartResponse(
        [{ dt: '20240101' }],
        'Y',
        'NEXT_KEY'
      )
      vi.mocked(axios.post).mockResolvedValue(pageResponse)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10081', {})

      // Assert: 최대 5번만 호출
      expect(axios.post).toHaveBeenCalledTimes(5)
      expect(result.candles).toHaveLength(5) // 각 페이지당 1개 캔들
    })

    it('cont-yn이 N이면 페이지네이션을 중단해야 한다', async () => {
      // Arrange: 첫 번째 응답에서 바로 종료
      const singlePageResponse = createDailyChartResponse(
        [
          { dt: '20240103' },
          { dt: '20240102' },
          { dt: '20240101' }
        ],
        'N',
        ''
      )
      vi.mocked(axios.post).mockResolvedValueOnce(singlePageResponse)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10081', {})

      // Assert: 한 번만 호출
      expect(axios.post).toHaveBeenCalledTimes(1)
      expect(result.candles).toHaveLength(3)
    })
  })

  describe('에러 처리', () => {
    it('API 오류 응답 시 예외를 발생시켜야 한다', async () => {
      // Arrange
      const errorResponse = {
        data: {
          return_code: -1,
          return_msg: '인증 실패'
        },
        headers: {}
      }
      vi.mocked(axios.post).mockResolvedValueOnce(errorResponse)

      // Act & Assert
      await expect(stockAPI.fetchChart('005930', 'ka10081', {})).rejects.toThrow('차트 데이터 조회 실패')
    })

    it('네트워크 에러 시 예외를 발생시켜야 한다', async () => {
      // Arrange
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'))

      // Act & Assert
      await expect(stockAPI.fetchChart('005930', 'ka10081', {})).rejects.toThrow()
    })

    it('빈 output 배열을 반환하면 빈 candles를 반환해야 한다', async () => {
      // Arrange
      const emptyResponse = {
        data: {
          return_code: 0,
          output: []
        },
        headers: { 'cont-yn': 'N', 'next-key': '' }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(emptyResponse)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10081', {})

      // Assert
      expect(result.candles).toHaveLength(0)
    })
  })
})
