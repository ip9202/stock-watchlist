/**
 * Auth Schema Tests
 *
 * TDD Phase 2: Verify Prisma schema has auth models
 */

import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'

describe('Auth Schema', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  it('should have hashedPassword field in User model', async () => {
    // @MX:TODO: Test will pass once hashedPassword field is added
    const user = await prisma.user.findFirst()
    if (user) {
      // User object should have hashedPassword property (may be null)
      expect(user).toHaveProperty('hashedPassword')
    }
  })

  it('should have Account model', async () => {
    // @MX:TODO: Test will pass once Account model is added
    // Verify Account model exists by checking Prisma metadata
    const userModel = prisma.user as any
    expect(prisma).toHaveProperty('account')
  })

  it('should have Session model', async () => {
    // @MX:TODO: Test will pass once Session model is added
    // Verify Session model exists
    expect(prisma).toHaveProperty('session')
  })

  it('should have VerificationToken model', async () => {
    // @MX:TODO: Test will pass once VerificationToken model is added
    // Verify VerificationToken model exists
    expect(prisma).toHaveProperty('verificationToken')
  })
})
