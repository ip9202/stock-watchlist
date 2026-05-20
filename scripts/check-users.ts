import { db } from '@/lib/db'

async function main() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  })
  
  console.log('Users:', users.length)
  if (users.length === 0) {
    console.log('No users found. Create admin user:')
    console.log('Email: admin@ip9202.site')
    console.log('Password: (needs to be created)')
  } else {
    console.table(users)
  }
}

main().catch(console.error)
