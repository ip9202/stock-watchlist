// 장시간 감지 유틸리티 (SPEC-POLL-001)
// MarketState: open | pre-market | post-market | closed
// getPollingInterval(dataType, marketState): 폴링 인터벌(ms) 반환

export type MarketState = 'open' | 'pre-market' | 'post-market' | 'closed'

export type DataType =
  | 'stock-price'
  | 'index'
  | 'minute-chart'
  | 'daily-chart'
  | 'weekly-chart'
  | 'exchange'
  | 'news'

/**
 * 현재 장 상태를 반환합니다
 * @param now - 기준 시간 (기본값: 현재 시간)
 * @returns MarketState - 장 상태 (open/pre-market/post-market/closed)
 *
 * 시간 구간:
 * - 정규장: 평일 09:00~15:30 → 'open'
 * - 장전: 평일 08:30~09:00 → 'pre-market'
 * - 장후: 평일 15:30~16:00 → 'post-market'
 * - 폐장: 그 외 (주말 포함) → 'closed'
 */
export function getMarketState(now: Date = new Date()): MarketState {
  const day = now.getDay() // 0=일, 1=월, ..., 6=토

  // 주말(토=6, 일=0)은 폐장
  if (day === 0 || day === 6) {
    return 'closed'
  }

  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  // 초 단위까지 포함하여 정확한 경계값 처리
  const timeInSeconds = hours * 3600 + minutes * 60 + seconds

  // 시간 구간 (초 단위)
  const PRE_MARKET_START = 8 * 3600 + 30 * 60 // 08:30:00 = 30600초
  const MARKET_OPEN = 9 * 3600 // 09:00:00 = 32400초
  const MARKET_CLOSE_END = 15 * 3600 + 30 * 60 // 15:30:00 = 55800초 (정규장 종료, 포함)
  const POST_MARKET_END = 16 * 3600 // 16:00:00 = 57600초 (장후 종료, 포함)

  // 정규장: 09:00:00 ~ 15:30:00 (15:30:00 포함, 15:30:01부터는 post-market)
  if (timeInSeconds >= MARKET_OPEN && timeInSeconds <= MARKET_CLOSE_END) {
    return 'open'
  }

  // 장전: 08:30:00 ~ 08:59:59
  if (timeInSeconds >= PRE_MARKET_START && timeInSeconds < MARKET_OPEN) {
    return 'pre-market'
  }

  // 장후: 15:30:01 ~ 16:00:00 (16:00:00 포함)
  if (timeInSeconds > MARKET_CLOSE_END && timeInSeconds <= POST_MARKET_END) {
    return 'post-market'
  }

  return 'closed'
}

/**
 * 데이터 타입과 장 상태에 따른 폴링 인터벌을 반환합니다 (밀리초)
 * @param dataType - 데이터 타입
 * @param marketState - 장 상태
 * @returns 폴링 인터벌 (밀리초), 0이면 폴링 중지
 *
 * 폴링 인터벌 표:
 * | DataType      | open       | pre-market | post-market | closed     |
 * |---------------|------------|-------------|-------------|------------|
 * | stock-price   | 15000      | 300000      | 300000      | 3600000    |
 * | index         | 30000      | 300000      | 300000      | 3600000    |
 * | minute-chart  | 60000      | 1800000     | 1800000     | 0          |
 * | daily-chart   | 300000     | 1800000     | 1800000     | 3600000    |
 * | weekly-chart  | 43200000   | 43200000    | 43200000    | 86400000   |
 * | exchange      | 3600000    | 14400000    | 14400000    | 43200000   |
 * | news          | 900000     | 3600000     | 3600000     | 3600000    |
 */
// @MX:ANCHOR: 폴링 인터벌 매핑 테이블 - usePollingData 훅에서 참조
// @MX:REASON: POLLING_INTERVALS는 usePollingData 훅에서 핵심 로직으로 사용됨
export function getPollingInterval(dataType: DataType, marketState: MarketState): number {
  // 폴링 인터벌 매핑 테이블 (밀리초)
  const POLLING_INTERVALS: Record<DataType, Record<MarketState, number>> = {
    'stock-price': {
      open: 15000, // 15초
      'pre-market': 300000, // 5분
      'post-market': 300000, // 5분
      'closed': 3600000 // 1시간
    },
    index: {
      open: 30000, // 30초
      'pre-market': 300000, // 5분
      'post-market': 300000, // 5분
      'closed': 3600000 // 1시간
    },
    'minute-chart': {
      open: 60000, // 1분
      'pre-market': 1800000, // 30분
      'post-market': 1800000, // 30분
      closed: 0 // 폴링 중지 (폐장 시 분봉 업데이트 없음)
    },
    'daily-chart': {
      open: 300000, // 5분
      'pre-market': 1800000, // 30분
      'post-market': 1800000, // 30분
      'closed': 3600000 // 1시간
    },
    'weekly-chart': {
      open: 43200000, // 12시간
      'pre-market': 43200000, // 12시간
      'post-market': 43200000, // 12시간
      'closed': 86400000 // 24시간
    },
    exchange: {
      open: 3600000, // 1시간
      'pre-market': 14400000, // 4시간
      'post-market': 14400000, // 4시간
      'closed': 43200000 // 12시간
    },
    news: {
      open: 900000, // 15분
      'pre-market': 3600000, // 1시간
      'post-market': 3600000, // 1시간
      'closed': 3600000 // 1시간
    }
  }

  return POLLING_INTERVALS[dataType][marketState]
}
