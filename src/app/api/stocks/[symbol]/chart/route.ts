import { NextRequest, NextResponse } from 'next/server'
import type { ChartData } from '@/types/stock'
import { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { KiwoomStockAPI } from '@/lib/kiwoom-stock-api'

// 일봉 캐시 TTL: 1시간 (밀리초)
const CACHE_TTL_DAILY = 3600000
// 주봉/월봉 캐시 TTL: 1일 (밀리초)
const CACHE_TTL_LONG = 86400000
// 분봉 캐시 TTL: 5분 (밀리초) - SPEC-CHART-003
const CACHE_TTL_MINUTE = 300000
// API 타임아웃: 2초 (밀리초)
const API_TIMEOUT = 2000

// period 파라미터 → TR ID 매핑 (SPEC-CHART-002: monthly 추가, SPEC-CHART-003: minute 추가)
// @MX:ANCHOR: 차트 API 엔드포인트 매핑 - period 추가 시 이 맵만 수정
// @MX:REASON: PERIOD_TO_API_ID는 3개 컴포넌트(라우트, 테스트, 클라이언트)에서 참조됨
const PERIOD_TO_API_ID: Record<string, string> = {
  daily: 'ka10081',
  weekly: 'ka10082',
  monthly: 'ka10083',
  minute: 'ka10080'
}

// 1일 TTL을 사용하는 period 집합 (weekly, monthly)
const LONG_TTL_PERIODS = new Set(['weekly', 'monthly'])

// 유효한 tic_scope 값 (분봉 틱 범위)
const VALID_TIC_SCOPES = new Set(['1', '3', '5', '10', '15', '30', '45', '60'])

/**
 * 차트 데이터 조회 API (SPEC-CHART-001, SPEC-CHART-002)
 * GET /api/stocks/{symbol}/chart?period=daily|weekly|monthly&from=YYYYMMDD&to=YYYYMMDD
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
    const ticScope = searchParams.get('tic_scope') || '1'

    // period 유효성 검사 (daily, weekly, monthly, minute 허용)
    if (!period || !PERIOD_TO_API_ID[period]) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'period 파라미터는 daily, weekly, monthly 또는 minute여야 합니다'
      }, { status: 400 })
    }

    // 분봉(minute) 요청 시 tic_scope 유효성 검사
    if (period === 'minute' && !VALID_TIC_SCOPES.has(ticScope)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `tic_scope 파라미터는 ${Array.from(VALID_TIC_SCOPES).join(', ')} 중 하나여야 합니다`
      }, { status: 400 })
    }

    const apiId = PERIOD_TO_API_ID[period]

    // 캐시 키: chart:{symbol}:{period}:{from}:{to} (분봉은 tic_scope 포함)
    const cacheKey = period === 'minute'
      ? `chart:${symbol}:${period}:${ticScope}:${from || ''}:${to || ''}`
      : `chart:${symbol}:${period}:${from || ''}:${to || ''}`

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

    // 분봉 요청 시 ticScope 파라미터 추가
    const fetchParams = period === 'minute'
      ? { from, to, ticScope }
      : { from, to }

    let chartData: ChartData
    try {
      chartData = await Promise.race([
        stockAPI.fetchChart(symbol, apiId, fetchParams),
        timeoutPromise
      ])
    } finally {
      // 타임아웃 핸들러 정리 (메모리 누수 방지)
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }

    // TTL 설정: minute → 5분, daily → 1시간, weekly/monthly → 1일
    const ttl = period === 'minute'
      ? CACHE_TTL_MINUTE
      : LONG_TTL_PERIODS.has(period) ? CACHE_TTL_LONG : CACHE_TTL_DAILY
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
