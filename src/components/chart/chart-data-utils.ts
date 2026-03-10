import { CandlestickData, LineData, UTCTimestamp } from 'lightweight-charts'
import { ChartCandle } from '@/types/stock'

/**
 * 날짜 문자열을 lightweight-charts 시간 형식으로 변환
 * - ISO 날짜시간 문자열(T 포함): UTCTimestamp (숫자, 초 단위)로 변환 (분봉용)
 * - YYYY-MM-DD 문자열: BusinessDay 형식(문자열) 유지 (일봉/주봉/월봉용)
 */
function toChartTime(date: string): `${number}-${number}-${number}` | UTCTimestamp {
  if (date.includes('T')) {
    // 분봉: 날짜 부분을 직접 파싱하여 Date.UTC()로 변환
    // new Date(date).getTime() 사용 시 로컬 타임존 → UTC 변환되어
    // KST 09:00이 UTC 00:00으로 표시되는 문제 방지
    const y = parseInt(date.slice(0, 4))
    const mo = parseInt(date.slice(5, 7)) - 1
    const d = parseInt(date.slice(8, 10))
    const h = parseInt(date.slice(11, 13))
    const mi = parseInt(date.slice(14, 16))
    const s = date.length >= 19 ? parseInt(date.slice(17, 19)) : 0
    return Math.floor(Date.UTC(y, mo, d, h, mi, s) / 1000) as UTCTimestamp
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
