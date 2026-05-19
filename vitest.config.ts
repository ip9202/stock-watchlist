import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  esbuild: {
    // JSX transform 설정 - React 자동 import
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      // auth 컴포넌트 테스트는 jsdom 환경 사용
      ['src/components/auth/**/*.test.tsx', 'jsdom'],
      ['src/components/auth/**/*.spec.tsx', 'jsdom'],
    ],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '.next/**',
        'coverage/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
