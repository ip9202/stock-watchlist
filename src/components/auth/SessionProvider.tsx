'use client'

/**
 * NextAuth 세션 프로바이더 래퍼 (SPEC-AUTH-001)
 *
 * 서버 컴포넌트(layout.tsx)에서 세션을 초기값으로 전달받아
 * 클라이언트 컴포넌트에서 useSession()을 사용할 수 있도록 한다.
 */
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

interface SessionProviderProps {
  children: React.ReactNode
  session: Session | null
}

// @MX:ANCHOR: [AUTO] 클라이언트 세션 컨텍스트 루트 - useSession() 사용하는 모든 컴포넌트의 부모
// @MX:REASON: AuthNav, 기타 인증 컴포넌트들이 이 Provider를 통해 세션에 접근
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session} basePath="/stocks/api/auth">
      {children}
    </NextAuthSessionProvider>
  )
}
