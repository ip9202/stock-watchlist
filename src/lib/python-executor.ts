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
  const { scriptPath, args = [], timeout = 30000 } = options
  const isProd = process.env.NODE_ENV === 'production'
  const isDev = process.env.NODE_ENV === 'development'
  
  // 환경변수에서 Python 경로 가져오기
  const customPythonPath = process.env.PYTHON_PATH
  
  if (isProd || customPythonPath) {
    // 실서버 또는 커스텀 Python 경로
    const pythonCommand = customPythonPath || 'python3'
    console.log(`[PROD] Using Python: ${pythonCommand}`)
    return `${pythonCommand} ${scriptPath} ${args.join(' ')}`
  } 
  else if (isDev) {
    // 개발환경: conda 가상환경 사용
    const condaPath = '/opt/anaconda3/etc/profile.d/conda.sh'
    const envName = 'py3_12'
    console.log(`[DEV] Using conda environment: ${envName}`)
    return `source ${condaPath} && conda activate ${envName} && python ${scriptPath} ${args.join(' ')}`
  } 
  else {
    // 기본: 시스템 Python 사용
    console.log(`[DEFAULT] Using system python3`)
    return `python3 ${scriptPath} ${args.join(' ')}`
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
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000,
      maxBuffer: 1024 * 1024 // 1MB
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
    
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Unknown error occurred'
    }
  }
}