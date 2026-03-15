/**
 * Environment Variable Validation
 *
 * Validates that all required environment variables are set at startup.
 * The application will fail fast with a clear error message if any required
 * environment variables are missing.
 */

// Required environment variables for the application to function
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'KIWOOM_APP_KEY',
  'KIWOOM_SECRET_KEY',
] as const

// Optional but recommended environment variables
const RECOMMENDED_ENV_VARS = [
  'DART_API_KEY',
  'NAVER_CLIENT_ID',
  'NAVER_CLIENT_SECRET',
] as const

/**
 * Validates that all required environment variables are set.
 * Throws an error with a detailed message if any are missing.
 */
export function validateEnv(): void {
  const missing: string[] = []

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
      `Please set these variables in your .env file or environment.\n` +
      `Refer to .env.example for the complete list.`
    )
  }
}

/**
 * Logs warnings for recommended but missing environment variables.
 */
export function warnAboutMissingRecommendedEnv(): void {
  const missing: string[] = []

  for (const envVar of RECOMMENDED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length > 0) {
    console.warn(
      `Warning: Recommended environment variables are not set:\n  ${missing.join('\n  ')}\n\n` +
      `Some features may not work correctly. Refer to .env.example.`
    )
  }
}

/**
 * Validates environment at module load time.
 * This will be called when the module is first imported.
 */
export function initializeEnv(): void {
  if (process.env.NODE_ENV !== 'test') {
    validateEnv()
    warnAboutMissingRecommendedEnv()
  }
}
