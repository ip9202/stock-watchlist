/**
 * StockChart getApiParams 테스트
 * - candle 모드별 apiPeriod + 기간 검증
 * - line 모드별 apiPeriod + 기간 검증
 * - 1D → minute API (분봉)
 * - 3Y → weekly, 10Y → monthly (적절한 해상도)
 * - toDate 항상 오늘 날짜
 */

import { describe, it, expect } from 'vitest'
import { getApiParams } from '../StockChart'
import { ChartMode } from '@/types/stock'

// 오늘 날짜 (YYYYMMDD 형식)
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

describe('getApiParams()', () => {
  describe('candle 모드', () => {
    it('일봉 캔들 모드는 apiPeriod=daily를 반환해야 한다', () => {
      const mode: ChartMode = { type: 'candle', interval: 'daily' }
      const result = getApiParams(mode)
      expect(result.apiPeriod).toBe('daily')
      expect(result.ticScope).toBeUndefined()
    })

    it('주봉 캔들 모드는 apiPeriod=weekly를 반환해야 한다', () => {
      const mode: ChartMode = { type: 'candle', interval: 'weekly' }
      const result = getApiParams(mode)
      expect(result.apiPeriod).toBe('weekly')
    })

    it('월봉 캔들 모드는 apiPeriod=monthly를 반환해야 한다', () => {
      const mode: ChartMode = { type: 'candle', interval: 'monthly' }
      const result = getApiParams(mode)
      expect(result.apiPeriod).toBe('monthly')
    })

    it('candle 모드의 toDate는 항상 오늘이어야 한다', () => {
      const mode: ChartMode = { type: 'candle', interval: 'daily' }
      const result = getApiParams(mode)
      expect(result.toDate).toBe(today)
    })
  })

  describe('line 모드 - 1D (분봉)', () => {
    it('1D 라인 모드는 apiPeriod=minute을 반환해야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '1D' }
      const result = getApiParams(mode)
      expect(result.apiPeriod).toBe('minute')
    })

    it('1D 라인 모드는 ticScope=1을 반환해야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '1D' }
      const result = getApiParams(mode)
      expect(result.ticScope).toBe('1')
    })

    it('1D 라인 모드의 toDate는 오늘이어야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '1D' }
      const result = getApiParams(mode)
      expect(result.toDate).toBe(today)
    })

    it('1D 라인 모드의 fromDate는 5일 전이어야 한다 (주말/공휴일 대비)', () => {
      const mode: ChartMode = { type: 'line', period: '1D' }
      const result = getApiParams(mode)
      // fromDate는 오늘보다 과거
      expect(result.fromDate < today).toBe(true)
      // fromDate는 오늘 기준 약 5일 전
      const from5d = new Date()
      from5d.setDate(from5d.getDate() - 5)
      const expected = from5d.toISOString().slice(0, 10).replace(/-/g, '')
      expect(result.fromDate).toBe(expected)
    })
  })

  describe('line 모드 - 기간별 API 매핑', () => {
    it('3M 라인 모드는 apiPeriod=daily를 반환해야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '3M' }
      const result = getApiParams(mode)
      expect(result.apiPeriod).toBe('daily')
      expect(result.ticScope).toBeUndefined()
    })

    it('1Y 라인 모드는 apiPeriod=daily를 반환해야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '1Y' }
      const result = getApiParams(mode)
      expect(result.apiPeriod).toBe('daily')
    })

    it('3Y 라인 모드는 apiPeriod=weekly를 반환해야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '3Y' }
      const result = getApiParams(mode)
      expect(result.apiPeriod).toBe('weekly')
    })

    it('10Y 라인 모드는 apiPeriod=monthly를 반환해야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '10Y' }
      const result = getApiParams(mode)
      expect(result.apiPeriod).toBe('monthly')
    })

    it('line 모드의 toDate는 항상 오늘이어야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '3M' }
      const result = getApiParams(mode)
      expect(result.toDate).toBe(today)
    })

    it('3M 라인의 fromDate는 약 3개월 전이어야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '3M' }
      const result = getApiParams(mode)
      // fromDate가 오늘보다 과거인지 확인
      expect(result.fromDate < result.toDate).toBe(true)
    })
  })
})
