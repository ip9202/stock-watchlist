import { describe, it, expect } from 'vitest'
import { toCandlestickData, toLineData } from '../chart-data-utils'
import { ChartCandle } from '@/types/stock'

// 테스트용 캔들 데이터 생성 헬퍼
function makeCandle(date: string, close: number): ChartCandle {
  return { date, open: close - 10, high: close + 10, low: close - 20, close, volume: 1000 }
}

describe('chart-data-utils', () => {
  describe('toCandlestickData', () => {
    it('중복 날짜가 있으면 마지막 값만 유지해야 한다', () => {
      // 에러 재현: 동일 날짜(2023-08-23)가 2번 존재
      const candles: ChartCandle[] = [
        makeCandle('2023-08-22', 100),
        makeCandle('2023-08-23', 110),
        makeCandle('2023-08-23', 115), // 중복 날짜
        makeCandle('2023-08-24', 120),
      ]

      const result = toCandlestickData(candles)

      expect(result).toHaveLength(3)
      // 중복 날짜 중 마지막 값(115)이 유지되어야 함
      const aug23 = result.find((d) => d.time === '2023-08-23')
      expect(aug23?.close).toBe(115)
    })

    it('날짜 기준 오름차순으로 정렬해야 한다', () => {
      const candles: ChartCandle[] = [
        makeCandle('2023-08-24', 120),
        makeCandle('2023-08-22', 100),
        makeCandle('2023-08-23', 110),
      ]

      const result = toCandlestickData(candles)

      expect(result.map((d) => d.time)).toEqual(['2023-08-22', '2023-08-23', '2023-08-24'])
    })

    it('빈 배열이면 빈 배열을 반환해야 한다', () => {
      expect(toCandlestickData([])).toEqual([])
    })

    it('단일 항목이면 그대로 반환해야 한다', () => {
      const result = toCandlestickData([makeCandle('2023-08-22', 100)])
      expect(result).toHaveLength(1)
    })
  })

  describe('분봉 데이터 처리 (SPEC-CHART-003)', () => {
    it('ISO 날짜시간 문자열(T 포함)을 UTCTimestamp(숫자)로 변환해야 한다', () => {
      // ISO 날짜시간 형식: 2026-03-10T09:01:00
      const candles: ChartCandle[] = [
        { date: '2026-03-10T09:01:00', open: 71000, high: 71500, low: 70800, close: 71200, volume: 500000 },
        { date: '2026-03-10T09:02:00', open: 71200, high: 71800, low: 71000, close: 71600, volume: 450000 },
      ]

      const result = toCandlestickData(candles)

      // UTCTimestamp는 숫자(초 단위 Unix 타임스탬프)여야 함
      expect(typeof result[0].time).toBe('number')
      expect(typeof result[1].time).toBe('number')
      // 시간 순서 오름차순
      expect(result[0].time).toBeLessThan(result[1].time as number)
    })

    it('날짜형(YYYY-MM-DD)은 BusinessDay(문자열) 형식을 유지해야 한다', () => {
      const candles: ChartCandle[] = [
        makeCandle('2023-08-22', 100),
        makeCandle('2023-08-23', 110),
      ]

      const result = toCandlestickData(candles)

      // 날짜 형식은 문자열(BusinessDay)이어야 함
      expect(typeof result[0].time).toBe('string')
    })

    it('분봉 데이터 중복 시간 제거 후 시간 오름차순 정렬해야 한다', () => {
      const candles: ChartCandle[] = [
        { date: '2026-03-10T09:03:00', open: 71500, high: 72000, low: 71300, close: 71800, volume: 600000 },
        { date: '2026-03-10T09:01:00', open: 71000, high: 71500, low: 70800, close: 71200, volume: 500000 },
        { date: '2026-03-10T09:02:00', open: 71200, high: 71800, low: 71000, close: 71600, volume: 450000 },
        { date: '2026-03-10T09:02:00', open: 71300, high: 71900, low: 71100, close: 71700, volume: 460000 }, // 중복
      ]

      const result = toCandlestickData(candles)

      // 중복 제거 후 3개
      expect(result).toHaveLength(3)
      // 시간 오름차순
      const times = result.map(d => d.time) as number[]
      expect(times[0]).toBeLessThan(times[1])
      expect(times[1]).toBeLessThan(times[2])
    })
  })

  describe('toLineData', () => {
    it('중복 날짜가 있으면 마지막 값만 유지해야 한다', () => {
      const candles: ChartCandle[] = [
        makeCandle('2023-08-22', 100),
        makeCandle('2023-08-23', 110),
        makeCandle('2023-08-23', 115), // 중복 날짜
        makeCandle('2023-08-24', 120),
      ]

      const result = toLineData(candles)

      expect(result).toHaveLength(3)
      const aug23 = result.find((d) => d.time === '2023-08-23')
      expect(aug23?.value).toBe(115)
    })

    it('날짜 기준 오름차순으로 정렬해야 한다', () => {
      const candles: ChartCandle[] = [
        makeCandle('2023-08-24', 120),
        makeCandle('2023-08-22', 100),
        makeCandle('2023-08-23', 110),
      ]

      const result = toLineData(candles)

      expect(result.map((d) => d.time)).toEqual(['2023-08-22', '2023-08-23', '2023-08-24'])
    })

    it('빈 배열이면 빈 배열을 반환해야 한다', () => {
      expect(toLineData([])).toEqual([])
    })

    it('분봉 ISO 날짜시간 문자열을 UTCTimestamp(숫자)로 변환해야 한다', () => {
      const candles: ChartCandle[] = [
        { date: '2026-03-10T09:01:00', open: 71000, high: 71500, low: 70800, close: 71200, volume: 500000 },
        { date: '2026-03-10T09:02:00', open: 71200, high: 71800, low: 71000, close: 71600, volume: 450000 },
      ]

      const result = toLineData(candles)

      // UTCTimestamp는 숫자여야 함
      expect(typeof result[0].time).toBe('number')
      // close 값이 value에 할당
      expect((result[0] as { value: number }).value).toBe(71200)
    })
  })
})
