/**
 * NextAuth.js 타입 확장 (SPEC-AUTH-001)
 *
 * 세션에 사용자 ID를 포함시키기 위한 타입 선언
 */

import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}
