import { NextRequest, NextResponse } from 'next/server'
import type { ExchangeRate, ExchangeRateHistory } from '@/types/stock'
import type { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { frankfurterApi } from '@/lib/frankfurter-api'

// 환율 캐시 TTL: 1시간 (3600초)
const CACHE_TTL_EXCHANGE = 3600

// 30일치 히스토리 조회
const HISTORY_DAYS = 30

// 캐시 키
const CACHE_KEY_EXCHANGE = 'market_exchange_usd_krw'

// 응답 타입 정의
interface ExchangeRateData {
  current: ExchangeRate
  history: ExchangeRateHistory[]
}

/**
 * USD/KRW 환율 조회 API (SPEC-MARKET-001 Task 2)
 * GET /api/market/exchange
 *
 * Frankfurter API(ECB 데이터)를 사용하여 실시간 환율 및 30일 히스토리 제공
 * 캐시 TTL: 1시간
 */
export async function GET(_request: NextRequest) {
  try {
    // 캐시 확인
    const cached = cache.get(CACHE_KEY_EXCHANGE)
    if (cached) {
      return NextResponse.json<ApiResponse<ExchangeRateData>>({
        success: true,
        data: cached
      })
    }

    // 30일 히스토리 날짜 범위 계산
    const today = new Date()
    const from = new Date(today)
    from.setDate(from.getDate() - HISTORY_DAYS)

    const fromStr = from.toISOString().slice(0, 10)
    const toStr = today.toISOString().slice(0, 10)

    // 현재 환율과 히스토리를 병렬로 조회
    const [current, history] = await Promise.all([
      frankfurterApi.getLatestRate(),
      frankfurterApi.getHistory(fromStr, toStr)
    ])

    const data: ExchangeRateData = { current, history }

    // 1시간 캐시 저장
    cache.set(CACHE_KEY_EXCHANGE, data, CACHE_TTL_EXCHANGE)

    return NextResponse.json<ApiResponse<ExchangeRateData>>({
      success: true,
      data
    })

  } catch (error) {
    console.error('Exchange rate API error:', error)
    const errorMessage = error instanceof Error ? error.message : '환율 데이터를 가져오는 데 실패했습니다'

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
