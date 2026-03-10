export interface StockInfo {
  symbol: string
  name: string
  price: number
  changeAmount: number
  changePercent: number
  volume: number
  marketCap?: number
  tradingValue?: number      // 추가: 거래대금
  sharesOutstanding?: number // 추가: 상장주식수
  volumeRatio?: number       // 추가: 거래량비중
  high?: number
  low?: number
  open?: number
  previousClose?: number
  high52w?: number
  low52w?: number
  timestamp?: Date
  extra_info?: {
    currency?: string
    exchange?: string
    sector?: string
    industry?: string
    fiftyTwoWeekHigh?: number
    fiftyTwoWeekLow?: number
    data_source?: string
    last_updated?: string
    is_etf?: boolean
  }
}

export interface StockSearchResult {
  symbol: string
  name: string
  market: string // KOSPI, KOSDAQ, etc.
}

export interface WatchlistItem {
  id: string
  userId: string
  symbol: string
  name: string
  order: number
  createdAt: Date
  updatedAt: Date
}

// 차트 캔들 데이터 (SPEC-CHART-001)
export interface ChartCandle {
  date: string      // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// 차트 데이터 응답 형식
export interface ChartData {
  symbol: string
  period: 'daily' | 'weekly' | 'monthly' | 'minute'
  candles: ChartCandle[]
}

// 캔들 간격 옵션 (일봉/주봉/월봉) → 캔들차트로 표시
export type CandleInterval = 'daily' | 'weekly' | 'monthly'

// 라인 차트 기간 옵션 → 라인차트(종가)로 표시
export type LinePeriod = '1D' | '3M' | '1Y' | '3Y' | '10Y'

// 차트 모드: 봉 타입 또는 기간 (상호 배타적 선택)
export type ChartMode =
  | { type: 'candle'; interval: CandleInterval }
  | { type: 'line'; period: LinePeriod }