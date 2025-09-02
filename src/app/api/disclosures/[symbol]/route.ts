import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { ApiResponse } from '@/types/api'

interface RouteParams {
  params: {
    symbol: string
  }
}

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
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { symbol } = params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    if (!symbol) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    // Python 스크립트 실행
    const pythonResult = await executePythonScript([
      'scripts/fetch_dart_disclosure.py', 
      '--symbol', symbol,
      '--days', days.toString()
    ])

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

// Python 스크립트 실행 함수
function executePythonScript(args: string[]): Promise<{ success: boolean; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const condaPath = '/opt/anaconda3/etc/profile.d/conda.sh'
    const envName = 'py3_12'
    const scriptPath = args[0]
    const scriptArgs = args.slice(1)

    // conda 환경 활성화 후 Python 스크립트 실행
    const command = `source ${condaPath} && conda activate ${envName} && python ${scriptPath} ${scriptArgs.join(' ')}`
    
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
          resolve({ success: true, data: result })
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          console.error('Python stdout:', stdout)
          resolve({ success: false, error: `JSON parse error: ${parseError}` })
        }
      } else {
        console.error('Python script error:', stderr)
        resolve({ success: false, error: stderr || `Python script exited with code ${code}` })
      }
    })

    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error)
      resolve({ success: false, error: error.message })
    })

    // 타임아웃 설정 (30초)
    setTimeout(() => {
      pythonProcess.kill('SIGTERM')
      resolve({ success: false, error: 'Python script timeout' })
    }, 30000)
  })
}