import { NextRequest, NextResponse } from 'next/server'
import { executeScript } from '@/lib/python-executor'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'

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

    const result = await executeScript('scripts/fetch_disclosure.py', args)
    
    if (!result.success) {
      console.error('Disclosure fetch failed:', result.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch disclosure data'
      }, { status: 500 })
    }

    let disclosureData
    try {
      disclosureData = JSON.parse(result.output)
    } catch (parseError) {
      console.error('Failed to parse disclosure JSON:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Invalid disclosure data format'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: disclosureData
    })

  } catch (error) {
    console.error('Disclosure API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}