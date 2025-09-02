import { NextRequest, NextResponse } from 'next/server'
import { executeScript } from '@/lib/python-executor'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'
    const name = searchParams.get('name') || ''

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Stock symbol is required'
      }, { status: 400 })
    }

    const args = [
      '--symbol', symbol,
      '--limit', limit
    ]

    if (name) {
      args.push('--name', name)
    }

    const result = await executeScript('scripts/fetch_stock_news.py', args)
    
    if (!result.success) {
      console.error('News fetch failed:', result.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch news data'
      }, { status: 500 })
    }

    let newsData
    try {
      newsData = JSON.parse(result.output)
    } catch (parseError) {
      console.error('Failed to parse news JSON:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Invalid news data format'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: newsData
    })

  } catch (error) {
    console.error('News API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}