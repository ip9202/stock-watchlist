/**
 * Auth Packages Installation Tests
 *
 * TDD Phase 1: Verify required auth packages are installed
 */

import { describe, it, expect } from 'vitest'
import packageJson from '../../../package.json'

describe('Auth Packages Installation', () => {
  it('should have next-auth installed', () => {
    expect(packageJson.dependencies).toHaveProperty('next-auth')
  })

  it('should have @auth/prisma-adapter installed', () => {
    expect(packageJson.dependencies).toHaveProperty('@auth/prisma-adapter')
  })

  it('should have bcryptjs installed', () => {
    expect(packageJson.dependencies).toHaveProperty('bcryptjs')
  })

  it('should have @types/bcryptjs installed', () => {
    expect(packageJson.devDependencies).toHaveProperty('@types/bcryptjs')
  })

  it('should use correct next-auth version (v5 beta)', () => {
    const version = packageJson.dependencies['next-auth']
    expect(version).toBeDefined()
    expect(version).toMatch(/5\.0\.0-beta/)
  })
})
