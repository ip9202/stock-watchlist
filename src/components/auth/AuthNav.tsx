'use client'

/**
 * 인증 상태 네비게이션 컴포넌트 (SPEC-AUTH-001)
 *
 * - 인증됨: 사용자 이메일 + 로그아웃 버튼
 * - 미인증: 로그인 버튼
 */
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { User, LogOut, LogIn } from 'lucide-react'

export function AuthNav() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="w-24 h-8 bg-gray-200 animate-pulse rounded-md" />
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{session.user?.email}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            signOut({ redirectTo: '/login' })
          }
          className="flex items-center gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span>로그아웃</span>
        </Button>
      </div>
    )
  }

  return (
    <Link href="/login">
      <Button variant="outline" size="sm" className="flex items-center gap-1.5">
        <LogIn className="h-4 w-4" />
        <span>로그인</span>
      </Button>
    </Link>
  )
}
