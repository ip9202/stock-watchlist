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

// 차트 API 응답 헬퍼: 일봉 데이터 생성 (실제 키움 API 응답 구조)
function createDailyChartResponse(candles: Array<{
  dt?: string
  open_pric?: string
  high_pric?: string
  low_pric?: string
  cur_prc?: string
  trde_qty?: string
}>, contYn = 'N', nextKey = '') {
  return {
    data: {
      return_code: 0,
      stk_dt_pole_chart_qry: candles.map(c => ({
        dt: c.dt || '20240101',
        open_pric: c.open_pric || '70000',
        high_pric: c.high_pric || '72000',
        low_pric: c.low_pric || '69000',
        cur_prc: c.cur_prc || '71000',
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
        { dt: '20240103', open_pric: '71500', high_pric: '73000', low_pric: '71000', cur_prc: '72000', trde_qty: '12000000' },
        { dt: '20240102', open_pric: '70000', high_pric: '72000', low_pric: '69500', cur_prc: '71500', trde_qty: '11000000' },
        { dt: '20240101', open_pric: '69000', high_pric: '70500', low_pric: '68500', cur_prc: '70000', trde_qty: '10000000' }
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
        { dt: '20240101', open_pric: '69000', high_pric: '70500', low_pric: '68500', cur_prc: '70000', trde_qty: '10000000' }
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
        { dt: '20240103', open_pric: '71500', high_pric: '73000', low_pric: '71000', cur_prc: '72000', trde_qty: '12000000' }
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
        { dt: '20231229', open_pric: '68000', high_pric: '72000', low_pric: '67500', cur_prc: '71000', trde_qty: '55000000' },
        { dt: '20231222', open_pric: '65000', high_pric: '69000', low_pric: '64500', cur_prc: '68000', trde_qty: '48000000' }
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
        { dt: '20231229', open_pric: '68000', high_pric: '72000', low_pric: '67500', cur_prc: '71000', trde_qty: '55000000' }
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
        [{ dt: '20240103', open_pric: '71500', high_pric: '73000', low_pric: '71000', cur_prc: '72000', trde_qty: '12000000' }],
        'Y',
        'NEXT_KEY_001'
      )
      // 두 번째 응답 - cont-yn: N (마지막 페이지)
      const page2Response = createDailyChartResponse(
        [{ dt: '20240102', open_pric: '70000', high_pric: '72000', low_pric: '69500', cur_prc: '71500', trde_qty: '11000000' }],
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

  describe('분봉 차트 조회 (ka10080) - SPEC-CHART-003', () => {
    it('분봉 차트 데이터를 성공적으로 조회해야 한다', async () => {
      // Arrange: 분봉 응답 (dt 형식: YYYYMMDDHHMMSS)
      const mockResponse = {
        data: {
          stk_dt_pole_chart_qry: [
            { dt: '20260310090100', open_pric: '71000', high_pric: '71500', low_pric: '70800', cur_prc: '71200', trde_qty: '500000' },
            { dt: '20260310090200', open_pric: '71200', high_pric: '71800', low_pric: '71000', cur_prc: '71600', trde_qty: '450000' },
          ]
        },
        headers: { 'cont-yn': 'N', 'next-key': '' }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10080', { from: '20260310', ticScope: '1' })

      // Assert
      expect(result.symbol).toBe('005930')
      expect(result.period).toBe('minute')
      expect(result.candles).toHaveLength(2)
    })

    it('ka10080으로 API를 호출하고 tic_scope 파라미터를 포함해야 한다', async () => {
      // Arrange
      const mockResponse = {
        data: { stk_dt_pole_chart_qry: [{ dt: '20260310090100', open_pric: '71000', high_pric: '71500', low_pric: '70800', cur_prc: '71200', trde_qty: '500000' }] },
        headers: { 'cont-yn': 'N', 'next-key': '' }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      await stockAPI.fetchChart('005930', 'ka10080', { from: '20260310', ticScope: '5' })

      // Assert: api-id 헤더와 tic_scope 본문 확인
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.kiwoom.com/api/dostk/chart',
        expect.objectContaining({ tic_scope: '5' }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'api-id': 'ka10080' })
        })
      )
    })

    it('분봉 dt(YYYYMMDDHHMMSS)가 ISO 날짜시간 문자열로 변환되어야 한다', async () => {
      // Arrange
      const mockResponse = {
        data: {
          stk_dt_pole_chart_qry: [
            { dt: '20260310090100', open_pric: '71000', high_pric: '71500', low_pric: '70800', cur_prc: '71200', trde_qty: '500000' }
          ]
        },
        headers: { 'cont-yn': 'N', 'next-key': '' }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      const result = await stockAPI.fetchChart('005930', 'ka10080', { from: '20260310', ticScope: '1' })

      // Assert: ISO 형식으로 변환 (YYYY-MM-DDTHH:MM:SS)
      expect(result.candles[0].date).toBe('2026-03-10T09:01:00')
    })

    it('ticScope 미전달 시 tic_scope를 요청 본문에 포함하지 않아야 한다', async () => {
      // Arrange: 일봉 요청 (ticScope 없음)
      const mockResponse = createDailyChartResponse([{ dt: '20240101' }])
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act
      await stockAPI.fetchChart('005930', 'ka10081', { from: '20240101' })

      // Assert: tic_scope가 요청 본문에 없어야 함
      const requestBody = vi.mocked(axios.post).mock.calls[0][1] as Record<string, string>
      expect(requestBody).not.toHaveProperty('tic_scope')
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
          stk_dt_pole_chart_qry: []
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
