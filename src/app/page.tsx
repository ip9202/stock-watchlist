/**
 * 대시보드 메인 페이지 (SPEC-AUTH-001 수정)
 *
 * - 서버 컴포넌트에서 auth() 세션 확인
 * - 미인증 → 미들웨어가 /login으로 리다이렉트 (여기서는 중복 방지용 fallback만)
 * - 인증됨: 사용자 이름 표시 + AuthNav 렌더링
 */
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/dashboard/DashboardClient"

export default async function DashboardPage() {
  const session = await auth()

  // 미들웨어가 먼저 처리하지만, 서버 컴포넌트에서도 방어적으로 체크
  if (!session) {
    redirect('/login')
  }

  return <DashboardClient userEmail={session.user?.email ?? null} />
}
