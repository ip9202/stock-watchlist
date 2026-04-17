/**
 * Stock Auto API 클라이언트
 * FastAPI 서버 (14.49.182.30:8080)의 AI 시그널 API를 호출하는 클라이언트
 */

const API_BASE_URL = process.env.STOCK_AUTO_API_URL || 'http://14.49.182.30:8080'
const TIMEOUT_MS = 5000

/**
 * 시그널 지표 타입
 */
export interface SignalIndicator {
  supertrend?: string
  rsi?: number
  macd?: string
  divergence?: string
  bollinger_bands?: string
  atr?: number
}

/**
 * AI 시그널 타입
 */
export interface Signal {
  stock_code: string
  stock_name: string
  signal_type: 'BUY' | 'SELL' | 'HOLD'
  score: number
  indicators: SignalIndicator
  created_at: string
}

/**
 * 시그널 목록 응답
 */
export interface MashupSignalResponse {
  signals: Signal[]
  count: number
  generated_at: string
}

/**
 * 발견(Discovery) 타입
 */
export interface Discovery {
  stock_code: string
  stock_name: string
  discovery_score: number
  grade: 'S' | 'A' | 'B' | 'C'
  sentiment: number
  reason: string
  created_at: string
}

/**
 * 발견 목록 응답
 */
export interface MashupDiscoveryResponse {
  discoveries: Discovery[]
  count: number
}

/**
 * 전체 시그널 목록 조회
 * @returns 시그널 목록 또는 null (에러 시)
 */
export async function fetchSignals(): Promise<MashupSignalResponse | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(`${API_BASE_URL}/api/mashup/signals`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Stock Auto API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data as MashupSignalResponse
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Stock Auto API timeout')
    } else {
      console.error('Stock Auto API error:', error)
    }
    return null
  }
}

/**
 * 종목별 시그널 조회
 * @param stockCode 종목코드 (6자리)
 * @returns 시그널 또는 null (에러/미조회 시)
 */
export async function fetchSignalByCode(stockCode: string): Promise<Signal | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(`${API_BASE_URL}/api/mashup/signals/${stockCode}`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      console.error(`Stock Auto API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data as Signal
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Stock Auto API timeout')
    } else {
      console.error('Stock Auto API error:', error)
    }
    return null
  }
}

/**
 * 전체 발견 목록 조회
 * @returns 발견 목록 또는 null (에러 시)
 */
export async function fetchDiscoveries(): Promise<MashupDiscoveryResponse | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(`${API_BASE_URL}/api/mashup/discoveries`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Stock Auto API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data as MashupDiscoveryResponse
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Stock Auto API timeout')
    } else {
      console.error('Stock Auto API error:', error)
    }
    return null
  }
}

/**
 * 종목별 발견 조회
 * @param stockCode 종목코드 (6자리)
 * @returns 발견 또는 null (에러/미조회 시)
 */
export async function fetchDiscoveryByCode(stockCode: string): Promise<Discovery | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(`${API_BASE_URL}/api/mashup/discoveries/${stockCode}`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      console.error(`Stock Auto API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data as Discovery
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Stock Auto API timeout')
    } else {
      console.error('Stock Auto API error:', error)
    }
    return null
  }
}
