import { NextRequest, NextResponse } from 'next/server'
import type { ChartCandle } from '@/types/stock'
import type { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { KiwoomStockAPI } from '@/lib/kiwoom-stock-api'

// 분봉 캐시 TTL: 1분 (60초)
const CACHE_TTL_MINUTE = 60
// 일봉 캐시 TTL: 1시간 (3600초)
const CACHE_TTL_DAILY = 3600

// 업종코드 매핑: kospi → 001, kosdaq → 101 (3자리)
const INDEX_CODE_MAP: Record<string, string> = {
  kospi: '001',
  kosdaq: '101',
}

// 유효한 period 값
const VALID_PERIODS = new Set(['minute', 'daily'])

// 유효한 tic_scope 값 (분봉 틱 범위)
const VALID_TIC_SCOPES = new Set(['1', '3', '5', '10', '15', '30', '45', '60'])

// 응답 데이터 타입
interface MarketChartData {
  candles: ChartCandle[]
}

/**
 * 업종 지수 차트 데이터 조회 API (SPEC-MARKET-001 Task 1)
 * GET /api/market/chart?index=kospi|kosdaq&period=minute|daily&from=YYYYMMDD&to=YYYYMMDD&tic_scope=1
 *
 * 키움증권 ka20005(분봉), ka20006(일봉) TR을 사용
 * 캐시 TTL: 분봉=1분, 일봉=1시간
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const index = searchParams.get('index')
    const period = searchParams.get('period')
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const ticScope = searchParams.get('tic_scope') || '1'

    // index 파라미터 유효성 검사
    if (!index || !INDEX_CODE_MAP[index]) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'index 파라미터는 kospi 또는 kosdaq이어야 합니다'
      }, { status: 400 })
    }

    // period 파라미터 유효성 검사
    if (!period || !VALID_PERIODS.has(period)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'period 파라미터는 minute 또는 daily이어야 합니다'
      }, { status: 400 })
    }

    // 분봉 요청 시 tic_scope 유효성 검사
    if (period === 'minute' && !VALID_TIC_SCOPES.has(ticScope)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `tic_scope 파라미터는 ${Array.from(VALID_TIC_SCOPES).join(', ')} 중 하나여야 합니다`
      }, { status: 400 })
    }

    const indsCd = INDEX_CODE_MAP[index]

    // 캐시 키: market_chart:{index}:{period}:{from}:{to} (분봉은 tic_scope 포함)
    const cacheKey = period === 'minute'
      ? `market_chart:${index}:${period}:${ticScope}:${from}:${to}`
      : `market_chart:${index}:${period}:${from}:${to}`

    // 캐시 확인
    const cached = cache.get(cacheKey)
    if (cached) {
      return NextResponse.json<ApiResponse<MarketChartData>>({
        success: true,
        data: cached
      })
    }

    const stockAPI = new KiwoomStockAPI()
    const candles = await stockAPI.fetchIndexChart(
      indsCd,
      period,
      from,
      to,
      period === 'minute' ? ticScope : undefined
    )

    const data: MarketChartData = { candles }

    // TTL 설정: 분봉=1분, 일봉=1시간
    const ttl = period === 'minute' ? CACHE_TTL_MINUTE : CACHE_TTL_DAILY
    cache.set(cacheKey, data, ttl)

    return NextResponse.json<ApiResponse<MarketChartData>>({
      success: true,
      data
    })

  } catch (error) {
    console.error('Market chart API error:', error)
    const errorMessage = error instanceof Error ? error.message : '업종 차트 데이터를 가져오는 데 실패했습니다'

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
