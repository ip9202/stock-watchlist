/**
 * 키움증권 REST API 엔드포인트 테스트
 * 다양한 TR ID를 시도하여 올바른 엔드포인트를 찾습니다
 */

import axios from 'axios'

const API_BASE_URL = 'https://api.kiwoom.com'
const APP_KEY = 'drdExBmXY0S8siLGH0IqQgsMsoxJdSojpuCQuGqLOrc'
const SECRET_KEY = 'OS9emePxrKQSshyRiV-FsAonQOJfQdlx3JHR42NLkds'

async function testTokenEndpoint() {
  console.log('📋 토큰 발급 엔드포인트 테스트')
  console.log('-'.repeat(50))

  try {
    const response = await axios.post(`${API_BASE_URL}/oauth2/token`, {
      grant_type: 'client_credentials',
      appkey: APP_KEY,
      secretkey: SECRET_KEY
    }, {
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      timeout: 10000
    })

    console.log('✅ 토큰 발급 성공:', JSON.stringify(response.data, null, 2))
    return response.data.token
  } catch (error) {
    console.error('❌ 토큰 발급 실패:', error)
    throw error
  }
}

async function testVariousStockListEndpoints(token: string) {
  console.log('\n📋 종목 리스트 엔드포인트 테스트')
  console.log('-'.repeat(50))

  const endpoints = [
    // CAF07010 - 주식 기본 정보 (기존)
    {
      name: 'CAF07010 (주식 기본 정보)',
      url: `${API_BASE_URL}/api/dostk/caf07010`,
      params: { tr_id: 'CAF07010', tr_cont: '', market_code: '1' }
    },
    // 다른 가능한 엔드포인트들
    {
      name: '주식 종목 검색',
      url: `${API_BASE_URL}/api/dostk/stkbasic`,
      params: { tr_id: 'CTPA0903R', tr_cont: '' }  // 종목 기본 정보 조회
    },
    {
      name: 'ETF/ETN 포함 전체 종목',
      url: `${API_BASE_URL}/api/dostk/stkcode`,
      params: { tr_id: 'SIFSNTCDD', tr_cont: '' }
    }
  ]

  for (const endpoint of endpoints) {
    console.log(`\n테스트: ${endpoint.name}`)
    console.log(`URL: ${endpoint.url}`)

    try {
      const response = await axios.get(endpoint.url, {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': `Bearer ${token}`,
          'appkey': APP_KEY,
          'appsecret': SECRET_KEY
        },
        params: endpoint.params,
        timeout: 10000
      })

      console.log(`✅ 성공! (상태코드: ${response.status})`)
      console.log(`응답:`, JSON.stringify(response.data, null, 2))

      // 첫 번째 성공한 엔드포인트를 찾으면 중단
      if (response.data.return_code === 0 && response.data.output) {
        console.log('\n🎉 성공적인 엔드포인트를 찾았습니다!')
        break
      }
    } catch (error: any) {
      console.log(`❌ 실패: ${error.message}`)
      if (error.response) {
        console.log(`   상태코드: ${error.response.status}`)
        console.log(`   응답:`, JSON.stringify(error.response.data, null, 2))
      }
    }
  }
}

async function testStockDetailEndpoint(token: string) {
  console.log('\n📋 개별 종목 시세 엔드포인트 테스트 (삼성전자 005930)')
  console.log('-'.repeat(50))

  const endpoints = [
    // KA10001 - 주식현재가시세 (기존)
    {
      name: 'KA10001 (주식현재가시세)',
      url: `${API_BASE_URL}/api/dostk/mdstock`,
      params: {
        tr_id: 'KA10001',
        tr_cont: '',
        mksc_shrn_iscd: '005930'  // 종목코드
      }
    },
    // 다른 가능한 엔드포인트
    {
      name: '주식 현재가 (다른 TR)',
      url: `${API_BASE_URL}/api/dostk/mdstock`,
      params: {
        tr_id: 'FHKST01010900',  // 주식 현재가 조회
        tr_cont: '',
        mksc_shrn_iscd: '005930'
      }
    }
  ]

  for (const endpoint of endpoints) {
    console.log(`\n테스트: ${endpoint.name}`)
    console.log(`URL: ${endpoint.url}`)

    try {
      const response = await axios.get(endpoint.url, {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': `Bearer ${token}`,
          'appkey': APP_KEY,
          'appsecret': SECRET_KEY
        },
        params: endpoint.params,
        timeout: 10000
      })

      console.log(`✅ 성공! (상태코드: ${response.status})`)
      console.log(`응답:`, JSON.stringify(response.data, null, 2))

      if (response.data.return_code === 0 && response.data.output) {
        console.log('\n🎉 성공적인 엔드포인트를 찾았습니다!')
        break
      }
    } catch (error: any) {
      console.log(`❌ 실패: ${error.message}`)
      if (error.response) {
        console.log(`   상태코드: ${error.response.status}`)
        console.log(`   응답:`, JSON.stringify(error.response.data, null, 2))
      }
    }
  }
}

async function main() {
  try {
    const token = await testTokenEndpoint()
    await testVariousStockListEndpoints(token)
    await testStockDetailEndpoint(token)

    console.log('\n' + '='.repeat(50))
    console.log('✅ 테스트 완료')

  } catch (error) {
    console.error('\n❌ 치명적 오류:', error)
    process.exit(1)
  }
}

main()
