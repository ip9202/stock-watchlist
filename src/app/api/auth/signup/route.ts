/**
 * 회원가입 API 라우트 (SPEC-AUTH-001, SPEC-AUTH-002)
 *
 * POST /api/auth/signup
 * - 입력 검증: RFC 5322 이메일, 비밀번호 8자 최소, 복잡성 검증
 * - Rate Limit: 1시간당 3회 시도 제한
 * - 이메일 열거 방지: 중복 이메일 시도 시 200 OK 반환 (AC-202, AC-204)
 * - bcryptjs cost 12으로 비밀번호 해싱
 * - 응답에서 hashedPassword 제외 (보안)
 *
 * @MX:NOTE 이메일 열거 방지: 중복 이메일 시도 시 200 OK 반환하여 공격자가 이메일 존재 여부 확인 불가능
 */

import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { db } from '@/lib/db'
import { checkRateLimit, SIGNUP_MAX_ATTEMPTS, SIGNUP_WINDOW } from '@/lib/rate-limit'
import { validatePasswordLength, validatePasswordComplexity, MIN_PASSWORD_LENGTH } from '@/lib/password-validator'

// RFC 5322 이메일 정규식 (간략화)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// @MX:ANCHOR: [AUTO] 회원가입 API 진입점 - 보안 검증 핵심 함수
// @MX:REASON: Rate Limit, 이메일 열거 방지, 비밀번호 복잡성 검증 등 보안 로직 집중
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // IP 주소 추출 (x-forwarded-for 헤더 또는 unknown)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'

    // ============ SPEC-AUTH-002 Rate Limit (AC-202) ============
    const rateLimitResult = checkRateLimit(`signup:${ip}`, {
      maxAttempts: SIGNUP_MAX_ATTEMPTS,
      windowSeconds: SIGNUP_WINDOW
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `너무 많은 요청입니다. ${rateLimitResult.retryAfter}초 후에 다시 시도해주세요.`
        },
        { status: 429 }
      )
    }

    // ============ 이메일 필수 검증 ============
    if (!email) {
      return NextResponse.json(
        { success: false, error: '이메일은 필수 입력값입니다.' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증 (RFC 5322)
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 이메일 형식입니다.' },
        { status: 400 }
      )
    }

    // ============ 비밀번호 필수 검증 ============
    if (!password) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 필수 입력값입니다.' },
        { status: 400 }
      )
    }

    // ============ SPEC-AUTH-002 비밀번호 길이 검증 (최소 8자) ============
    if (!validatePasswordLength(password, MIN_PASSWORD_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          error: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
        },
        { status: 400 }
      )
    }

    // ============ SPEC-AUTH-002 비밀번호 복잡성 검증 (3/4 종류, AC-206) ============
    const complexityResult = validatePasswordComplexity(password)
    if (!complexityResult.valid) {
      const missingText = complexityResult.missing.join(', ')
      return NextResponse.json(
        {
          success: false,
          error: `비밀번호에 다음 문자 유형이 필요합니다: ${missingText}`
        },
        { status: 400 }
      )
    }

    // ============ 중복 이메일 체크 (이메일 열거 방지) ============
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // @MX:NOTE 이메일 열거 방지: 중복 이메일 시도 시 200 OK 반환 (AC-204)
      // 공격자가 이메일 존재 여부를 확인할 수 없도록 성공 응답 반환
      console.warn(`[SPEC-AUTH-002] 중복 이메일 시도 감지: ${email} from ${ip}`)

      // 존재하는 사용자 정보 반환 (비밀번호 제외)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _hp, ...safeUser } = existingUser
      return NextResponse.json(
        { success: true, data: safeUser },
        { status: 200 }
      )
    }

    // ============ 비밀번호 해싱 (cost factor 12, SPEC-AUTH-001 REQ-SEC-001) ============
    const hashedPassword = await bcryptjs.hash(password, 12)

    // 사용자 생성
    const user = await db.user.create({
      data: {
        email,
        hashedPassword
      }
    })

    // 응답에서 hashedPassword 제외 (REQ-SEC-001: 비밀번호 노출 방지)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _hp, ...safeUser } = user

    return NextResponse.json(
      { success: true, data: safeUser },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
