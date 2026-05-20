'use client'

/**
 * Global Error Boundary (Next.js 15 App Router)
 *
 * 모든 에러를 캡처하고 사용자에게 친근적인 메시지 표시
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            오류가 발생했습니다
          </h1>
          <p className="text-gray-700 mb-2">
            죄송합니다. 예기치 못한 오류가 발생했습니다.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {error?.message || '알 수 없는 오류입니다.'}
          </p>
          <button
            onClick={() => router.push('/stocks')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
