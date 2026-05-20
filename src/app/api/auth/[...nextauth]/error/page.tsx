'use client'

/**
 * NextAuth Error Page (SPEC-AUTH-001)
 *
 * NextAuth v5 App Router용 에러 페이지
 * - 인증 실패 시 표시
 * - 에러 메시지 한국어 번역
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Error(props: any) {
  const { error } = props
  const router = useRouter()

  useEffect(() => {
    if (error) console.error('Auth error:', error)
  }, [error])

  // 에러 코드별 한글 메시지
  const getErrorMessage = (errcode?: string) => {
    switch (errcode) {
      case 'CredentialsSignin':
        return '이메일 또는 비밀번호가 올바르지 않습니다.'
      case 'EmailCreateAccount':
        return '이미 사용 중인 이메일입니다.'
      case 'OAuthAccountNotLinked':
        return '이미 다른 방법으로 가입된 계정입니다.'
      case 'Configuration':
        return '서버 설정 오류가 발생했습니다. 관리자에게 문의해주세요.'
      case 'AccessDenied':
        return '접근이 거부되었습니다.'
      case 'Verification':
        return '이메일 인증이 필요합니다.'
      default:
        return error?.message || '인증 중 오류가 발생했습니다.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">인증 오류</h1>
          <p className="text-gray-700 mb-6">
            {getErrorMessage(error.errcode)}
          </p>
          <button
            onClick={() => router.push('/stocks/login')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
