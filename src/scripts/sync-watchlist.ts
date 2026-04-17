/**
 * Watchlist 동기화 스크립트
 * DB의 모든 관심종목을 stock_auto 서버로 일괄 동기화
 *
 * 사용법:
 *   npx tsx src/scripts/sync-watchlist.ts
 */

import { db } from '@/lib/db'
import { syncWatchlistAdd } from '@/lib/stock-auto/sync-client'

const DELAY_MS = 100 // 각 요청 사이의 딜레이 (레이트 리미팅 방지)

/**
 * 시장구분 결정 함수
 * @param symbol 종목코드
 * @returns 'KOSPI' 또는 'KOSDAQ'
 */
function determineMarket(symbol: string): 'KOSPI' | 'KOSDAQ' {
  // 종목코드 5번째 자리가 0~3이면 KOSPI, 4~9면 KOSDAQ
  const fifthDigit = symbol.length >= 5 ? parseInt(symbol[4]) : 0
  return fifthDigit <= 3 ? 'KOSPI' : 'KOSDAQ'
}

/**
 * 딜레이 함수
 * @param ms 밀리초
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 메인 함수
 */
export async function main(): Promise<void> {
  console.log('Watchlist 동기화 시작...')

  try {
    // DB에서 모든 관심종목 조회
    const watchlistItems = await db.watchlist.findMany({
      select: {
        symbol: true,
        name: true
      }
    })

    console.log(`총 ${watchlistItems.length}개 종목을 동기화합니다.`)

    let successCount = 0
    let failureCount = 0

    // 각 종목을 순차적으로 동기화
    for (const item of watchlistItems) {
      const market = determineMarket(item.symbol)

      try {
        const result = await syncWatchlistAdd(item.symbol, item.name, market)

        if (result) {
          console.log(`✓ ${item.symbol} (${item.name}) - ${market}`)
          successCount++
        } else {
          console.log(`✗ ${item.symbol} (${item.name}) - 동기화 실패`)
          failureCount++
        }
      } catch (error) {
        console.error(`✗ ${item.symbol} (${item.name}) - 에러 발생:`, error)
        failureCount++
      }

      // 레이트 리미팅 방지를 위한 딜레이
      if (watchlistItems.indexOf(item) < watchlistItems.length - 1) {
        await delay(DELAY_MS)
      }
    }

    console.log(`\n동기화 완료: 성공 ${successCount}, 실패 ${failureCount}`)
  } catch (error) {
    console.error('동기화 중 에러 발생:', error)
    process.exit(1)
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main()
}
