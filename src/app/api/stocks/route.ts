import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { StockSearchResult, ApiResponse } from '@/types/stock'
import { createPythonCommand } from '@/lib/python-executor'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query) {
      return NextResponse.json<ApiResponse<StockSearchResult[]>>({
        success: false,
        error: 'Query parameter is required'
      }, { status: 400 })
    }

    // Python 검색 스크립트 실행
    const searchResult = await executeStockSearch(query, limit)

    if (!searchResult.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: searchResult.error
      }, { status: 500 })
    }

    // 결과 형식 변환
    const searchResults: StockSearchResult[] = searchResult.results.map((result: any) => ({
      symbol: result.symbol,
      name: result.name,
      market: result.market
    }))

    return NextResponse.json<ApiResponse<StockSearchResult[]>>({
      success: true,
      data: searchResults
    })

  } catch (error) {
    console.error('Stock search error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Python 주식 검색 스크립트 실행
function executeStockSearch(query: string, limit: number): Promise<{ success: boolean; results?: any[]; error?: string }> {
  return new Promise((resolve) => {
    const scriptArgs = [
      '--search', query,
      '--limit', limit.toString()
    ]

    // 환경에 따라 자동으로 Python 명령어 생성 (개발: conda, 실서버: python3)
    const command = createPythonCommand({
      scriptPath: 'scripts/fetch_all_stocks.py',
      args: scriptArgs,
      timeout: 30000
    })
    
    const pythonProcess = spawn('bash', ['-c', command], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout)
          if (result.success) {
            resolve({ success: true, results: result.results })
          } else {
            resolve({ success: false, error: result.error || 'Search failed' })
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          console.error('Python stdout:', stdout)
          resolve({ success: false, error: `JSON parse error: ${parseError}` })
        }
      } else {
        console.error('Python search error:', stderr)
        resolve({ success: false, error: stderr || `Search script exited with code ${code}` })
      }
    })

    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error)
      resolve({ success: false, error: error.message })
    })

    // 타임아웃 설정 (10초)
    setTimeout(() => {
      pythonProcess.kill('SIGTERM')
      resolve({ success: false, error: 'Search timeout' })
    }, 10000)
  })
}