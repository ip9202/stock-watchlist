/**
 * 회원가입 API 라우트 (SPEC-AUTH-001)
 *
 * POST /api/auth/signup
 * - 입력 검증: RFC 5322 이메일, 비밀번호 8자 이상
 * - 중복 이메일 체크
 * - bcryptjs cost 12으로 비밀번호 해싱
 * - 응답에서 hashedPassword 제외 (보안)
 */

import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { db } from '@/lib/db'

// RFC 5322 이메일 정규식 (간략화)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// @MX:ANCHOR: [AUTO] 회원가입 API 진입점 - 보안 검증 핵심 함수
// @MX:REASON: 이메일 검증, 중복체크, bcrypt 해싱 등 보안 로직 집중
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 이메일 필수 검증
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

    // 비밀번호 필수 검증
    if (!password) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 필수 입력값입니다.' },
        { status: 400 }
      )
    }

    // 비밀번호 길이 검증 (최소 8자)
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // 중복 이메일 체크
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 이메일입니다.' },
        { status: 409 }
      )
    }

    // 비밀번호 해싱 (cost factor 12, SPEC-AUTH-001 REQ-SEC-001)
    const hashedPassword = await bcryptjs.hash(password, 12)

    // 사용자 생성
    const user = await db.user.create({
      data: {
        email,
        hashedPassword
      }
    })

    // 응답에서 hashedPassword 제외 (REQ-SEC-001: 비밀번호 노출 방지)
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
