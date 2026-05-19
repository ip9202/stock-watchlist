/**
 * NextAuth.js v5 API 라우트 핸들러 (SPEC-AUTH-001)
 *
 * GET/POST /api/auth/[...nextauth]
 * - handlers를 그대로 export하여 NextAuth가 모든 인증 엔드포인트 처리
 */

import { handlers } from '@/lib/auth'

// @MX:ANCHOR: [AUTO] NextAuth API 라우트 - GET/POST 요청을 NextAuth handlers로 위임
// @MX:REASON: 인증 시스템 전체의 HTTP 진입점
export const { GET, POST } = handlers
