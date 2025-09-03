const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 데모 사용자 시드 데이터 생성 중...')
  
  // 데모 사용자 확인 및 생성
  const existingUser = await prisma.user.findUnique({
    where: { email: 'demo@example.com' }
  })
  
  if (!existingUser) {
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo@example.com',
        name: 'Demo User'
      }
    })
    console.log('✅ 데모 사용자 생성 완료:', demoUser.email)
  } else {
    console.log('✅ 데모 사용자가 이미 존재합니다:', existingUser.email)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ 시드 데이터 생성 오류:', e)
    await prisma.$disconnect()
    process.exit(1)
  })