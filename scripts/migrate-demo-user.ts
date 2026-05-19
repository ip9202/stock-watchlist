/**
 * 데모 사용자 데이터 마이그레이션 스크립트 (SPEC-AUTH-001 REQ-NFR-004)
 *
 * 기존 demo@example.com 사용자의 관심종목을 admin@example.com으로 이관.
 * 실행: npx tsx scripts/migrate-demo-user.ts
 */

import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const db = new PrismaClient()

const DEMO_EMAIL = 'demo@example.com'
const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_NAME = 'Admin'
// @MX:WARN: [AUTO] 마이그레이션 스크립트 초기 비밀번호 - 실행 후 즉시 변경 필요
// @MX:REASON: 하드코딩된 초기 비밀번호는 보안 위험. 마이그레이션 후 관리자가 직접 변경해야 함
const ADMIN_INITIAL_PASSWORD = 'ChangeMe123!'

async function main() {
  console.log('데모 사용자 마이그레이션 시작...')

  const demoUser = await db.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { watchlists: true }
  })

  if (!demoUser) {
    console.log('demo@example.com 사용자가 없습니다. 마이그레이션 불필요.')
    return
  }

  console.log(`demo 사용자 발견: ${demoUser.watchlists.length}개 관심종목`)

  // admin 계정 생성 또는 조회
  let adminUser = await db.user.findUnique({ where: { email: ADMIN_EMAIL } })

  if (!adminUser) {
    const hashedPassword = await bcryptjs.hash(ADMIN_INITIAL_PASSWORD, 12)
    adminUser = await db.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        hashedPassword
      }
    })
    console.log(`admin 계정 생성 완료: ${ADMIN_EMAIL}`)
    console.log(`초기 비밀번호: ${ADMIN_INITIAL_PASSWORD} (즉시 변경 필요)`)
  } else {
    console.log(`기존 admin 계정 사용: ${ADMIN_EMAIL}`)
  }

  // 관심종목 이관
  let migrated = 0
  let skipped = 0

  for (const item of demoUser.watchlists) {
    const existing = await db.watchlist.findUnique({
      where: { userId_symbol: { userId: adminUser.id, symbol: item.symbol } }
    })

    if (existing) {
      skipped++
      continue
    }

    await db.watchlist.create({
      data: {
        userId: adminUser.id,
        symbol: item.symbol,
        name: item.name,
        order: item.order
      }
    })
    migrated++
  }

  console.log(`마이그레이션 완료: ${migrated}개 이관, ${skipped}개 중복 건너뜀`)

  // 데모 사용자 삭제 여부 확인 (선택적)
  console.log('\n데모 사용자 삭제는 수동으로 수행하세요:')
  console.log(`  DELETE FROM users WHERE email = '${DEMO_EMAIL}';`)
}

main()
  .catch((e) => {
    console.error('마이그레이션 실패:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
