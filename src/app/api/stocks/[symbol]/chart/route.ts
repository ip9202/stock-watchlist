import { NextRequest, NextResponse } from 'next/server'
import type { ChartData } from '@/types/stock'
import { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { KiwoomStockAPI } from '@/lib/kiwoom-stock-api'

// 일봉 캐시 TTL: 1시간 (밀리초)
const CACHE_TTL_DAILY = 3600000
// 주봉 캐시 TTL: 1일 (밀리초)
const CACHE_TTL_WEEKLY = 86400000
// API 타임아웃: 2초 (밀리초)
const API_TIMEOUT = 2000

// period 파라미터 → TR ID 매핑
const PERIOD_TO_API_ID: Record<string, string> = {
  daily: 'ka10081',
  weekly: 'ka10082'
}

/**
 * 차트 데이터 조회 API (SPEC-CHART-001)
 * GET /api/stocks/{symbol}/chart?period=daily|weekly&from=YYYYMMDD&to=YYYYMMDD
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params

    // symbol 유효성 검사
    if (!symbol) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period')
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    // period 유효성 검사
    if (!period || !PERIOD_TO_API_ID[period]) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'period 파라미터는 daily 또는 weekly여야 합니다'
      }, { status: 400 })
    }

    const apiId = PERIOD_TO_API_ID[period]

    // 캐시 키: chart:{symbol}:{period}:{from}:{to}
    const cacheKey = `chart:${symbol}:${period}:${from || ''}:${to || ''}`

    // 캐시 확인
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return NextResponse.json<ApiResponse<ChartData>>({
        success: true,
        data: cachedData as ChartData
      })
    }

    // API 호출 (2초 타임아웃 적용)
    const stockAPI = new KiwoomStockAPI()
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Request timeout')), API_TIMEOUT)
    })

    let chartData: ChartData
    try {
      chartData = await Promise.race([
        stockAPI.fetchChart(symbol, apiId, { from, to }),
        timeoutPromise
      ])
    } finally {
      // 타임아웃 핸들러 정리 (메모리 누수 방지)
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }

    // TTL 설정: daily → 1시간, weekly → 1일
    const ttl = period === 'weekly' ? CACHE_TTL_WEEKLY : CACHE_TTL_DAILY
    cache.set(cacheKey, chartData, ttl)

    return NextResponse.json<ApiResponse<ChartData>>({
      success: true,
      data: chartData
    })

  } catch (error) {
    console.error('Chart data error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chart data'

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
