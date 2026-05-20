/**
 * 키움증권 REST API 다양한 형식 테스트
 */

import axios from 'axios'

const APP_KEY = 'drdExBmXY0S8siLGH0IqQgsMsoxJdSojpuCQuGqLOrc'
const SECRET_KEY = 'OS9emePxrKQSshyRiV-FsAonQOJfQdlx3JHR42NLkds'

async function testToken() {
  const response = await axios.post('https://api.kiwoom.com/oauth2/token', {
    grant_type: 'client_credentials',
    appkey: APP_KEY,
    secretkey: SECRET_KEY
  }, {
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  })
  return response.data.token
}

async function testVariants(token: string) {
  console.log('다양한 API 형식 테스트\n')

  // 테스트 케이스
  const testCases = [
    {
      name: '실전 API + GET + Authorization 대문자',
      baseUrl: 'https://api.kiwoom.com',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'appkey': APP_KEY,
        'appsecret': SECRET_KEY
      }
    },
    {
      name: '실전 API + GET + authorization 소문자',
      baseUrl: 'https://api.kiwoom.com',
      method: 'GET',
      headers: {
        'authorization': `Bearer ${token}`,
        'appkey': APP_KEY,
        'appsecret': SECRET_KEY
      }
    },
    {
      name: '모의투자 API + GET',
      baseUrl: 'https://mockapi.kiwoom.com',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'appkey': APP_KEY,
        'appsecret': SECRET_KEY
      }
    },
    {
      name: '실전 API + POST (일부 TR은 POST 필요)',
      baseUrl: 'https://api.kiwoom.com',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'appkey': APP_KEY,
        'appsecret': SECRET_KEY
      }
    }
  ]

  // 테스트할 TR ID들
  const trIds = [
    { tr_id: 'CAF07010', desc: '주식 기본 정보' },
    { tr_id: 'SIFSRVT0', desc: '전체 종목 조회' },
    { tr_id: 'CTPA0903R', desc: '종목 기본 정보' }
  ]

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`테스트: ${testCase.name}`)
    console.log(`-`.repeat(60))

    for (const { tr_id, desc } of trIds) {
      console.log(`\n  TR: ${tr_id} (${desc})`)

      try {
        let response
        const url = `${testCase.baseUrl}/api/dostk/stkbasic`
        const params = { tr_id, tr_cont: '', market_code: '1' }

        if (testCase.method === 'GET') {
          response = await axios.get(url, {
            headers: testCase.headers,
            params,
            timeout: 10000
          })
        } else {
          response = await axios.post(url, params, {
            headers: testCase.headers,
            timeout: 10000
          })
        }

        if (response.data.return_code === 0) {
          console.log(`  ✅ 성공!`)
          if (response.data.output) {
            const output = Array.isArray(response.data.output)
              ? response.data.output.slice(0, 3)
              : response.data.output
            console.log(`  📊 샘플 데이터:`, JSON.stringify(output).substring(0, 200))
          }
          break // 성공하면 다음 테스트 케이스로
        } else {
          console.log(`  ❌ return_code: ${response.data.return_code}, msg: ${response.data.return_msg}`)
        }

      } catch (error: any) {
        if (error.response) {
          console.log(`  ❌ 상태코드: ${error.response.status}`)
          if (error.response.data) {
            console.log(`     에러:`, JSON.stringify(error.response.data).substring(0, 200))
          }
        } else {
          console.log(`  ❌ 에러: ${error.message}`)
        }
      }
    }
  }

  // 추가: mdstock (주식 현재가) 테스트
  console.log(`\n${'='.repeat(60)}`)
  console.log(`개별 종목 시세 테스트 (삼성전자 005930)`)
  console.log(`-`.repeat(60))

  const mdstockCases = [
    {
      name: 'KA10001 (주식현재가시세)',
      params: { tr_id: 'KA10001', tr_cont: '', mksc_shrn_iscd: '005930' }
    },
    {
      name: 'FHKST01010900 (주식현재가 조회)',
      params: { tr_id: 'FHKST01010900', tr_cont: '', mksc_shrn_iscd: '005930' }
    }
  ]

  for (const { name, params } of mdstockCases) {
    console.log(`\n  TR: ${name}`)
    try {
      const response = await axios.get('https://api.kiwoom.com/api/dostk/mdstock', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'appkey': APP_KEY,
          'appsecret': SECRET_KEY
        },
        params,
        timeout: 10000
      })

      if (response.data.return_code === 0) {
        console.log(`  ✅ 성공!`)
        console.log(`  📊 데이터:`, JSON.stringify(response.data.output).substring(0, 300))
      } else {
        console.log(`  ❌ return_code: ${response.data.return_code}`)
      }
    } catch (error: any) {
      console.log(`  ❌ 에러: ${error.response?.status || error.message}`)
    }
  }
}

async function main() {
  try {
    const token = await testToken()
    console.log('✅ 토큰 발급 성공\n')
    await testVariants(token)
  } catch (error) {
    console.error('❌ 오류:', error)
  }
}

main()
