import { NextRequest, NextResponse } from 'next/server'
import { StockInfo } from '@/types/stock'
import { ApiResponse } from '@/types/api'
import path from 'path'
import { cache } from '@/lib/cache'
import { promises as fs } from 'fs'
import { executeScript } from '@/lib/python-executor'

export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    // 캐시 키 생성
    const cacheKey = `stock_${symbol}`
    
    // 캐시된 데이터 확인 (30초 TTL)
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      console.log(`Cache HIT for ${symbol}`)
      return NextResponse.json<ApiResponse<StockInfo>>({
        success: true,
        data: cachedData
      })
    }

    console.log(`Cache MISS for ${symbol} - fetching new data`)

    // Python 스크립트 실행 (환경 자동 감지)
    const result = await executeScript('scripts/fetch_stock_data.py', ['--symbol', symbol])
    
    if (!result.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: result.error || 'Failed to fetch stock data'
      }, { status: 500 })
    }
    
    // Python 스크립트 결과 파싱
    const pythonResult = JSON.parse(result.output)
    
    if (!pythonResult.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: pythonResult.error || 'Failed to fetch stock data'
      }, { status: 500 })
    }

    // 한글 종목명 가져오기
    const allStocksPath = path.join(process.cwd(), 'all_stocks_cache.json');
    const allStocksFile = await fs.readFile(allStocksPath, 'utf-8');
    const allStocksData = JSON.parse(allStocksFile);
    
    const stockFromCache = allStocksData.data.find((stock: any) => stock.symbol === symbol);
    const koreanName = stockFromCache?.name;

    // StockInfo 형식으로 변환
    const stockInfo: StockInfo = {
      symbol: pythonResult.symbol,
      name: koreanName || pythonResult.name, // 한글 이름이 있으면 사용, 없으면 API 결과 사용
      price: pythonResult.price,
      changeAmount: pythonResult.changeAmount,
      changePercent: pythonResult.changePercent,
      volume: pythonResult.volume,
      marketCap: pythonResult.marketCap,
      high: pythonResult.high,
      low: pythonResult.low,
      open: pythonResult.open,
      previousClose: pythonResult.previousClose,
      timestamp: new Date(pythonResult.timestamp),
      extra_info: pythonResult.extra_info || {}
    }

    // 캐시에 저장 (30초 TTL)
    cache.set(cacheKey, stockInfo, 30)
    console.log(`Cached ${symbol} for 30 seconds`)

    return NextResponse.json<ApiResponse<StockInfo>>({
      success: true,
      data: stockInfo
    })

  } catch (error) {
    console.error('Stock info error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}