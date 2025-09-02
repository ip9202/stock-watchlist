import { NextRequest, NextResponse } from 'next/server'
import { executeScript } from '@/lib/python-executor'
import { ApiResponse } from '@/types/api'

interface DisclosureItem {
  rcept_no: string
  rcept_dt: string
  report_nm: string
  corp_name: string
  flr_nm: string
  rm: string
  url: string
}

interface MultipleDisclosureData {
  [symbol: string]: {
    success: boolean
    disclosures: DisclosureItem[]
    total_count: number
    error?: string
  }
}

// 여러 종목의 공시정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    const days = parseInt(searchParams.get('days') || '7')

    if (!symbolsParam) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbols parameter is required (comma-separated)'
      }, { status: 400 })
    }

    const symbols = symbolsParam.split(',').map(s => s.trim())

    if (symbols.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'At least one symbol is required'
      }, { status: 400 })
    }

    // 각 심볼별로 공시 데이터 수집
    const disclosureData: MultipleDisclosureData = {}
    
    for (const symbol of symbols) {
      try {
        const result = await executeScript('scripts/fetch_disclosure.py', [
          '--symbol', symbol,
          '--limit', '5'
        ])

        if (result.success) {
          const data = JSON.parse(result.output)
          disclosureData[symbol] = {
            success: true,
            disclosures: data.disclosures || [],
            total_count: data.total_count || 0
          }
        } else {
          disclosureData[symbol] = {
            success: false,
            disclosures: [],
            total_count: 0,
            error: result.error || 'Failed to fetch disclosure data'
          }
        }
      } catch (error) {
        disclosureData[symbol] = {
          success: false,
          disclosures: [],
          total_count: 0,
          error: `Error processing ${symbol}: ${error}`
        }
      }
    }

    return NextResponse.json<ApiResponse<MultipleDisclosureData>>({
      success: true,
      data: disclosureData
    })

  } catch (error) {
    console.error('Disclosures API error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// 관심종목의 공시정보 조회
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { watchlistSymbols, days = 7 } = body

    if (!watchlistSymbols || !Array.isArray(watchlistSymbols)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'watchlistSymbols array is required'
      }, { status: 400 })
    }

    if (watchlistSymbols.length === 0) {
      return NextResponse.json<ApiResponse<MultipleDisclosureData>>({
        success: true,
        data: {}
      })
    }

    // 각 심볼별로 공시 데이터 수집
    const disclosureData: MultipleDisclosureData = {}
    
    for (const symbol of watchlistSymbols) {
      try {
        const result = await executeScript('scripts/fetch_disclosure.py', [
          '--symbol', symbol,
          '--limit', '5'
        ])

        if (result.success) {
          const data = JSON.parse(result.output)
          disclosureData[symbol] = {
            success: true,
            disclosures: data.disclosures || [],
            total_count: data.total_count || 0
          }
        } else {
          disclosureData[symbol] = {
            success: false,
            disclosures: [],
            total_count: 0,
            error: result.error || 'Failed to fetch disclosure data'
          }
        }
      } catch (error) {
        disclosureData[symbol] = {
          success: false,
          disclosures: [],
          total_count: 0,
          error: `Error processing ${symbol}: ${error}`
        }
      }
    }

    return NextResponse.json<ApiResponse<MultipleDisclosureData>>({
      success: true,
      data: disclosureData
    })

  } catch (error) {
    console.error('Watchlist disclosures API error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}