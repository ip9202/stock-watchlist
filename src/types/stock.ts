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