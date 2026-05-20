/**
 * NextAuth.js v5 설정 (SPEC-AUTH-001)
 *
 * - Credentials Provider (이메일/비밀번호)
 * - @auth/prisma-adapter 사용
 * - bcryptjs cost factor 12으로 비밀번호 검증
 * - 계정 존재 여부 노출 방지
 */

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcryptjs from 'bcryptjs'
import { db } from '@/lib/db'

// @MX:ANCHOR: [AUTO] 인증 핵심 함수 - Credentials Provider, signup route, middleware에서 호출
// @MX:REASON: 세 곳 이상에서 참조하며 보안 핵심 로직 포함
export async function authorizeCredentials(credentials: {
  email: string
  password: string
}): Promise<{ id: string; email: string; name: string | null } | null> {
  const { email, password } = credentials

  // 빈 값 검증
  if (!email || !password) {
    return null
  }

  // 사용자 조회
  const user = await db.user.findUnique({
    where: { email }
  })

  // 사용자 없음 또는 비밀번호 없음 (계정 존재 여부 노출 방지: 동일 null 반환)
  if (!user || !user.hashedPassword) {
    return null
  }

  // 비밀번호 검증
  const isValid = await bcryptjs.compare(password, user.hashedPassword)

  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name
  }
}

// @MX:ANCHOR: [AUTO] NextAuth 설정 핵심 객체 - 전체 인증 시스템의 진입점
// @MX:REASON: route handler, middleware, 서버 컴포넌트 모두에서 참조
export const { handlers, auth, signIn, signOut } = NextAuth({
  // @MX:NOTE: [AUTO] basePath는 /api/auth - Next.js route handler에서 req.url은 basePath(/stocks) 제거된 상태
  // @MX:NOTE: Auth.js는 new URL(req.url).pathname으로 액션 파싱 → /api/auth로 설정해야 매칭됨
  // @MX:NOTE: 클라이언트는 SessionProvider basePath="/stocks/api/auth"로 /stocks/api/auth/*로 요청
  // @MX:NOTE: Nginx /stocks → 3005 프록시 → Next.js basePath 제거 → /api/auth/callback/credentials → Auth.js 매칭
  // @MX:NOTE: PrismaAdapter 제외 - Credentials Provider는 JWT strategy 사용으로 DB 어댑터 불필요
  basePath: '/api/auth',
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/stocks/login',
    error: '/stocks/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      // @MX:WARN: [AUTO] authorize 함수는 null 반환 시 "이메일 또는 비밀번호가 올바르지 않습니다" 에러를 표시
      // @MX:REASON: NextAuth v5에서 null 반환은 인증 실패를 의미하며, 에러 메시지는 signIn() 호출 측에서 처리
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        return authorizeCredentials({
          email: credentials.email as string,
          password: credentials.password as string
        })
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub
      }
      return session
    }
  }
})
