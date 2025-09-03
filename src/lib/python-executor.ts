/**
 * Python 스크립트 실행을 위한 유틸리티
 * 개발환경(conda)과 실서버(직접 python) 자동 감지
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface PythonExecutionOptions {
  scriptPath: string
  args?: string[]
  timeout?: number
  cwd?: string
}

export interface ExecutionResult {
  success: boolean
  output: string
  error?: string
}

export function createPythonCommand(options: PythonExecutionOptions): string {
  const { scriptPath, args = [] } = options
  const isProd = process.env.NODE_ENV === 'production'
  const isDev = process.env.NODE_ENV === 'development'
  
  // 환경변수에서 Python 경로 가져오기
  const customPythonPath = process.env.PYTHON_PATH
  
  // 인수를 안전하게 이스케이프 처리 (한글 지원)
  const escapedArgs = args.map(arg => {
    // 한글 문자를 Base64로 인코딩하여 전달
    if (/[ㄱ-ㅎ가-힣]/.test(arg)) {
      const encoded = Buffer.from(arg, 'utf8').toString('base64')
      return `"$(echo '${encoded}' | base64 -d)"`
    }
    // 일반 인수는 따옴표로 감싸기
    return `"${arg.replace(/"/g, '\\"')}"`
  }).join(' ')
  
  if (isProd || customPythonPath) {
    // 실서버 또는 커스텀 Python 경로
    const pythonCommand = customPythonPath || 'python3'
    console.log(`[PROD] Using Python: ${pythonCommand}`)
    return `${pythonCommand} ${scriptPath} ${escapedArgs}`
  } 
  else if (isDev) {
    // 개발환경: conda 가상환경 사용
    const condaPath = '/opt/anaconda3/etc/profile.d/conda.sh'
    const envName = 'py3_12'
    console.log(`[DEV] Using conda environment: ${envName}`)
    return `source ${condaPath} && conda activate ${envName} && python ${scriptPath} ${escapedArgs}`
  } 
  else {
    // 기본: 시스템 Python 사용
    console.log(`[DEFAULT] Using system python3`)
    return `python3 ${scriptPath} ${escapedArgs}`
  }
}

export function getPythonEnvironmentInfo(): {
  environment: 'development' | 'production' | 'unknown'
  pythonCommand: string
  usingConda: boolean
} {
  const isProd = process.env.NODE_ENV === 'production'
  const isDev = process.env.NODE_ENV === 'development'
  const customPythonPath = process.env.PYTHON_PATH
  
  if (isProd) {
    return {
      environment: 'production',
      pythonCommand: customPythonPath || 'python3',
      usingConda: false
    }
  } else if (isDev) {
    return {
      environment: 'development',
      pythonCommand: 'conda activate py3_12 && python',
      usingConda: true
    }
  } else {
    return {
      environment: 'unknown',
      pythonCommand: 'python3',
      usingConda: false
    }
  }
}

export async function executeScript(scriptPath: string, args: string[] = []): Promise<ExecutionResult> {
  try {
    const command = createPythonCommand({ scriptPath, args })
    
    // Next.js 환경변수를 Python 프로세스에 전달
    const env = {
      ...process.env,
      // API 키들 명시적으로 전달
      NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
      NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET,
      DART_API_KEY: process.env.DART_API_KEY,
      KOREA_INVESTMENT_APP_KEY: process.env.KOREA_INVESTMENT_APP_KEY,
      KOREA_INVESTMENT_APP_SECRET: process.env.KOREA_INVESTMENT_APP_SECRET,
    }
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000,
      maxBuffer: 1024 * 1024, // 1MB
      env: env
    })
    
    if (stderr && !stdout) {
      return {
        success: false,
        output: '',
        error: stderr
      }
    }
    
    return {
      success: true,
      output: stdout.trim()
    }
    
  } catch (error: unknown) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}