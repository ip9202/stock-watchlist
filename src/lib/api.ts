/**
 * 클라이언트 컴포넌트용 API fetch 헬퍼
 * Next.js basePath는 fetch()에 자동 적용되지 않으므로 수동 prefix 필요
 */

const basePath = process.env.__NEXT_ROUTER_BASEPATH || ''

/**
 * basePath가 적용된 API URL을 반환
 * @param path - API 경로 (예: '/api/stocks')
 */
export function apiUrl(path: string): string {
  return `${basePath}${path}`
}

/**
 * basePath가 적용된 fetch 래퍼
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init)
}
