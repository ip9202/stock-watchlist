import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { StockSearchResult } from '@/types/stock'
import { ApiResponse } from '@/types/api'
import { createPythonCommand } from '@/lib/python-executor'

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

    // Python 검색 스크립트 실행
    const searchResult = await executeStockSearch(query, limit)

    if (!searchResult.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: searchResult.error
      }, { status: 500 })
    }

    // 결과 형식 변환
    const searchResults: StockSearchResult[] = searchResult.results?.map((result: any) => ({
      symbol: result.symbol,
      name: result.name,
      market: result.market
    })) || []

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
  return new Promise(async (resolve) => {
    const fs = require('fs')
    const path = require('path')
    
    // 임시 파일에 검색 쿼리 저장 (한글 인코딩 문제 해결)
    const tempQueryFile = path.join(process.cwd(), 'temp_query.txt')
    fs.writeFileSync(tempQueryFile, query, 'utf8')
    
    const scriptArgs = [
      '--limit', limit.toString()
    ]

    // 환경에 따라 자동으로 Python 명령어 생성 (개발: conda, 실서버: python3)
    // 캐시 파일 절대 경로 지정
    const cacheFile = `/app/all_stocks_cache.json`
    scriptArgs.push('--cache', cacheFile)
    
    const command = createPythonCommand({
      scriptPath: 'scripts/fetch_all_stocks.py',
      args: scriptArgs,
      timeout: 180000  // 3분으로 증가 (첫 캐시 생성 시간 고려)
    })
    
    const pythonProcess = spawn('bash', ['-c', command], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env,
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
        PYTHONIOENCODING: 'utf-8',
        SEARCH_QUERY: query  // 환경변수로 검색 쿼리 전달
      }
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
      console.log(`Python process exited with code: ${code}`)
      console.log(`stdout length: ${stdout.length}`)
      console.log(`stderr length: ${stderr.length}`)
      
      // 임시 파일 정리 (에러가 나도 삭제 시도)
      try {
        if (fs.existsSync(tempQueryFile)) {
          fs.unlinkSync(tempQueryFile)
        }
      } catch (e) {
        console.log('Temp file cleanup failed:', e)
      }
      
      if (code === 0) {
        try {
          // JSON 라인만 추출 (첫 번째 { 부터 마지막 } 까지)
          const jsonStart = stdout.indexOf('{')
          const jsonEnd = stdout.lastIndexOf('}') + 1
          
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const jsonString = stdout.substring(jsonStart, jsonEnd)
            console.log('Extracted JSON:', jsonString.substring(0, 200) + '...')
            
            const result = JSON.parse(jsonString)
            if (result.success && result.results) {
              console.log(`Found ${result.results.length} results`)
              resolve({ success: true, results: result.results })
            } else {
              resolve({ success: false, error: result.error || 'Search failed' })
            }
          } else {
            console.error('No JSON found in stdout')
            resolve({ success: false, error: 'No JSON output from Python script' })
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          console.error('Python stdout (first 500 chars):', stdout.substring(0, 500))
          resolve({ success: false, error: `JSON parse error: ${parseError}` })
        }
      } else {
        console.error('Python search error:', stderr)
        resolve({ success: false, error: stderr || `Search script exited with code ${code}` })
      }
    })

    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error)
      // 임시 파일 정리
      try {
        if (fs.existsSync(tempQueryFile)) {
          fs.unlinkSync(tempQueryFile)
        }
      } catch (e) {
        console.log('Temp file cleanup failed:', e)
      }
      resolve({ success: false, error: error.message })
    })

    // 타임아웃 설정 (3분)
    setTimeout(() => {
      pythonProcess.kill('SIGTERM')
      // 임시 파일 정리
      try {
        if (fs.existsSync(tempQueryFile)) {
          fs.unlinkSync(tempQueryFile)
        }
      } catch (e) {
        console.log('Temp file cleanup failed:', e)
      }
      resolve({ success: false, error: 'Search timeout' })
    }, 180000)
  })
}