import { CandlestickData, LineData, UTCTimestamp } from 'lightweight-charts'
import { ChartCandle } from '@/types/stock'

/**
 * 날짜 문자열을 lightweight-charts 시간 형식으로 변환
 * - ISO 날짜시간 문자열(T 포함): UTCTimestamp (숫자, 초 단위)로 변환 (분봉용)
 * - YYYY-MM-DD 문자열: BusinessDay 형식(문자열) 유지 (일봉/주봉/월봉용)
 */
function toChartTime(date: string): `${number}-${number}-${number}` | UTCTimestamp {
  if (date.includes('T')) {
    // 분봉: ISO 날짜시간 문자열 → UTCTimestamp (초 단위)
    return Math.floor(new Date(date).getTime() / 1000) as UTCTimestamp
  }
  // 일봉/주봉/월봉: BusinessDay 형식 유지
  return date as `${number}-${number}-${number}`
}

/**
 * 캔들 데이터를 캔들스틱 차트 형식으로 변환
 * - 날짜 기준 오름차순 정렬
 * - 중복 날짜/시간 제거 (마지막 값 유지)
 * - 분봉(T 포함 날짜): UTCTimestamp 사용, 일봉: BusinessDay 사용
 */
export function toCandlestickData(data: ChartCandle[]): CandlestickData[] {
  // Map으로 중복 날짜/시간 제거 (동일 날짜 시 마지막 값 유지)
  const deduped = new Map<string, CandlestickData>()
  for (const c of data) {
    deduped.set(c.date, {
      time: toChartTime(c.date),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })
  }
  return Array.from(deduped.values()).sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
}

/**
 * 캔들 데이터를 라인 차트 형식으로 변환 (종가 기준)
 * - 날짜 기준 오름차순 정렬
 * - 중복 날짜/시간 제거 (마지막 값 유지)
 * - 분봉(T 포함 날짜): UTCTimestamp 사용, 일봉: BusinessDay 사용
 */
export function toLineData(data: ChartCandle[]): LineData[] {
  // Map으로 중복 날짜/시간 제거 (동일 날짜 시 마지막 값 유지)
  const deduped = new Map<string, LineData>()
  for (const c of data) {
    deduped.set(c.date, {
      time: toChartTime(c.date),
      value: c.close,
    })
  }
  return Array.from(deduped.values()).sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
}
