/**
 * StockChart getApiParams 테스트 (SPEC-CHART-003)
 * - 1D 모드 → minute API (분봉)
 * - candle/line 모드별 apiPeriod 검증
 * - ticScope 파라미터 검증
 */

import { describe, it, expect } from 'vitest'
import { getApiParams } from '../StockChart'
import { ChartMode } from '@/types/stock'

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

    it('1D 라인 모드의 fromDate는 오늘 날짜(YYYYMMDD 형식)여야 한다', () => {
      const mode: ChartMode = { type: 'line', period: '1D' }
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const result = getApiParams(mode)
      expect(result.fromDate).toBe(today)
    })
  })

  describe('line 모드 - 나머지 기간', () => {
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
  })
})
