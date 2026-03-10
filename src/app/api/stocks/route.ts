import { NextRequest, NextResponse } from 'next/server'
import { StockSearchResult } from '@/types/stock'
import { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { KiwoomStockAPI } from '@/lib/kiwoom-stock-api'

const CACHE_KEY_ALL_STOCKS = 'all_stocks_list'
const CACHE_TTL_ALL_STOCKS = 7 * 24 * 60 * 60 // 7일 (초)

/**
 * 종목 검색 API (REQ-002: PyKRX → Kiwoom REST API 전환)
 * GET /api/stocks?q={query}&limit={limit}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get('q')
    const query = rawQuery ? decodeURIComponent(rawQuery) : null
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query) {
      return NextResponse.json<ApiResponse<StockSearchResult[]>>({
        success: false,
        error: 'Query parameter is required'
      }, { status: 400 })
    }

    // 전체 종목 리스트 가져오기 (7일 캐시)
    const allStocks = await getAllStocks()

    // 종목 검색
    const stockAPI = new KiwoomStockAPI()
    const searchResults = stockAPI.searchStocks(query, allStocks, limit)

    // 결과 형식 변환
    const results: StockSearchResult[] = searchResults.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market
    }))

    return NextResponse.json<ApiResponse<StockSearchResult[]>>({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Stock search error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

/**
 * 전체 종목 리스트 가져오기 (REQ-002, REQ-005: 캐시 전략)
 */
async function getAllStocks(): Promise<Array<{ symbol: string; name: string; market: string; search_keywords: string[] }>> {
  // 캐시 확인
  const cachedData = cache.get(CACHE_KEY_ALL_STOCKS)
  if (cachedData) {
    console.log('Cache HIT for all stocks list')
    return cachedData
  }

  console.log('Cache MISS for all stocks list - fetching from Kiwoom REST API')

  // Kiwoom REST API에서 종목 리스트 조회
  const stockAPI = new KiwoomStockAPI()
  const allStocks = await stockAPI.fetchStockList('ALL')

  // 캐시에 저장 (7일 TTL)
  cache.set(CACHE_KEY_ALL_STOCKS, allStocks, CACHE_TTL_ALL_STOCKS)
  console.log(`Cached all stocks list for ${CACHE_TTL_ALL_STOCKS} seconds`)

  return allStocks
}
