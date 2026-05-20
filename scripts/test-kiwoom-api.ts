/**
 * 실제 키움증권 REST API 테스트 스크립트
 *
 * 실행 방법:
 * npm run test:api
 * 또는
 * KIWOOM_APP_KEY=xxx KIWOOM_SECRET_KEY=xxx npx tsx scripts/test-kiwoom-api.ts
 */

import { KiwoomTokenManager } from '../src/lib/kiwoom-token-manager'
import { KiwoomStockAPI } from '../src/lib/kiwoom-stock-api'

async function testKiwoomAPI() {
  console.log('🔑 키움증권 REST API 실제 연동 테스트\n')
  console.log('='.repeat(50))

  // 환경변수 확인
  const appKey = process.env.KIWOOM_APP_KEY
  const secretKey = process.env.KIWOOM_SECRET_KEY

  if (!appKey || !secretKey) {
    console.error('❌ 환경변수가 설정되지 않았습니다.')
    console.error('KIWOOM_APP_KEY와 KIWOOM_SECRET_KEY를 설정해주세요.')
    process.exit(1)
  }

  console.log(`✅ App Key: ${appKey.substring(0, 10)}...`)
  console.log(`✅ Secret Key: ${secretKey.substring(0, 10)}...`)
  console.log('')

  try {
    // 테스트 1: 토큰 발급
    console.log('📋 테스트 1: 토큰 발급')
    console.log('-'.repeat(50))
    const tokenManager = KiwoomTokenManager.getInstance()
    const token = await tokenManager.getAccessToken()
    console.log(`✅ 토큰 발급 성공: ${token.substring(0, 20)}...`)
    console.log('')

    // 테스트 2: KOSPI 종목 리스트 조회
    console.log('📋 테스트 2: KOSPI 종목 리스트 조회 (최대 5개)')
    console.log('-'.repeat(50))
    const stockAPI = new KiwoomStockAPI()
    const kospiStocks = await stockAPI.fetchStockList('KOSPI')
    console.log(`✅ KOSPI 종목 수: ${kospiStocks.length}`)
    console.log('상위 5개 종목:')
    kospiStocks.slice(0, 5).forEach(stock => {
      console.log(`  - ${stock.symbol} | ${stock.name} | ${stock.market}`)
    })
    console.log('')

    // 테스트 3: KOSDAQ 종목 리스트 조회
    console.log('📋 테스트 3: KOSDAQ 종목 리스트 조회 (최대 5개)')
    console.log('-'.repeat(50))
    const kosdaqStocks = await stockAPI.fetchStockList('KOSDAQ')
    console.log(`✅ KOSDAQ 종목 수: ${kosdaqStocks.length}`)
    console.log('상위 5개 종목:')
    kosdaqStocks.slice(0, 5).forEach(stock => {
      console.log(`  - ${stock.symbol} | ${stock.name} | ${stock.market}`)
    })
    console.log('')

    // 테스트 4: 개별 종목 시세 조회 (삼성전자)
    console.log('📋 테스트 4: 삼성전자(005930) 시세 조회')
    console.log('-'.repeat(50))
    const samsungDetail = await stockAPI.fetchStockDetail('005930')
    console.log('✅ 삼성전자 시세:')
    console.log(`  - 종목코드: ${samsungDetail.symbol}`)
    console.log(`  - 현재가: ${samsungDetail.price?.toLocaleString() || 'N/A'}원`)
    console.log(`  - 전일대비: ${samsungDetail.changeAmount?.toLocaleString() || 'N/A'}원`)
    console.log(`  - 등락율: ${samsungDetail.changePercent || 'N/A'}%`)
    console.log(`  - 거래량: ${samsungDetail.volume?.toLocaleString() || 'N/A'}주`)
    console.log(`  - 시가총액: ${samsungDetail.marketCap?.toLocaleString() || 'N/A'}원`)
    console.log(`  - 52주 고가: ${samsungDetail.high52w?.toLocaleString() || 'N/A'}원`)
    console.log(`  - 52주 저가: ${samsungDetail.low52w?.toLocaleString() || 'N/A'}원`)
    console.log('')

    // 테스트 5: 종목 검색
    console.log('📋 테스트 5: "삼성전자" 검색')
    console.log('-'.repeat(50))
    const allStocks = [...kospiStocks, ...kosdaqStocks]
    const searchResults = stockAPI.searchStocks('삼성전자', allStocks, 5)
    console.log(`✅ 검색 결과: ${searchResults.length}개`)
    searchResults.forEach(stock => {
      console.log(`  - ${stock.symbol} | ${stock.name} | ${stock.market}`)
    })
    console.log('')

    // 테스트 6: 토큰 재사용 확인
    console.log('📋 테스트 6: 토큰 캐싱 확인')
    console.log('-'.repeat(50))
    const token2 = await tokenManager.getAccessToken()
    console.log(`✅ 토큰 재사용: ${token === token2 ? '성공 (같은 토큰)' : '실패 (새 토큰)'}`)
    console.log('')

    console.log('='.repeat(50))
    console.log('🎉 모든 테스트가 성공적으로 완료되었습니다!')
    console.log('')

  } catch (error) {
    console.error('❌ 테스트 실패:')
    if (error instanceof Error) {
      console.error(`   에러 메시지: ${error.message}`)
      console.error(`   스택 트레이스:`)
      console.error(error.stack)
    } else {
      console.error('   알 수 없는 에러:', error)
    }
    process.exit(1)
  }
}

// 실행
testKiwoomAPI()
