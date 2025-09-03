import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types/api'
import { executeScript } from '@/lib/python-executor'

interface DisclosureItem {
  rcept_no: string
  rcept_dt: string
  report_nm: string
  corp_name: string
  flr_nm: string
  rm: string
  url: string
}

interface DisclosureData {
  success: boolean
  disclosures: DisclosureItem[]
  total_count: number
}

// 특정 종목의 공시정보 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    if (!symbol) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    // Python 스크립트 실행
    const result = await executeScript('scripts/fetch_dart_disclosure.py', [
      '--symbol', symbol,
      '--days', days.toString()
    ])

    if (!result.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: result.error || 'Failed to fetch disclosure data'
      }, { status: 500 })
    }

    const pythonResult = JSON.parse(result.output)

    if (!pythonResult.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: pythonResult.error
      }, { status: 500 })
    }

    const disclosureData = pythonResult.data?.data?.[symbol]
    
    if (!disclosureData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No disclosure data found for this symbol'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse<DisclosureData>>({
      success: true,
      data: disclosureData
    })

  } catch (error) {
    console.error('Disclosure API error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}