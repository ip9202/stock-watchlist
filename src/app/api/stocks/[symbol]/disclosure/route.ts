import { NextRequest, NextResponse } from 'next/server'

// 종목 코드 → DART 기업 코드 매핑 (하드코딩)
const CORP_CODE_MAP: Record<string, string> = {
  '005930': '00126380', // 삼성전자
  '000660': '00164779', // SK하이닉스
  '035420': '00413684', // NAVER
  '005380': '00126180', // 현대차
  '000270': '00125494', // 기아
  '006400': '00164936', // 삼성SDI
  '051910': '00434003', // LG화학
  '035720': '00413885', // 카카오
  '068270': '00329639', // 셀트리온
  '207940': '00616479', // 삼성바이오로직스
  '012330': '00126186', // 현대모비스
  '003550': '00125361', // LG
  '066570': '00356412', // LG전자
  '051900': '00434000', // LG생활건강
  '096770': '00301937', // SK이노베이션
  '000880': '00125470', // 한화
  '007570': '00164286', // 일양약품
  '326030': '00877631', // SK바이오팜
  '028050': '00164397', // 삼성엔지니어링
  '018260': '00164443', // 삼성에스디에스
}

// DART 공시 API 응답 아이템 타입
interface DartDisclosureItem {
  report_nm: string
  corp_name: string
  rcept_dt: string
  flr_nm: string
  rcept_no: string
  corp_cls: string
  rm: string
}

// DART API 응답 타입
interface DartApiResponse {
  status: string
  message?: string
  list?: DartDisclosureItem[]
}

// YYYYMMDD → YYYY-MM-DD 변환
function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

// 오늘 날짜를 YYYYMMDD 형식으로 반환
function getTodayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

// 30일 전 날짜를 YYYYMMDD 형식으로 반환
function getThirtyDaysAgoString(): string {
  const now = new Date()
  now.setDate(now.getDate() - 30)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Stock symbol is required'
      }, { status: 400 })
    }

    // 매핑에 없는 종목은 빈 공시 배열 반환
    const corpCode = CORP_CODE_MAP[symbol]
    if (!corpCode) {
      return NextResponse.json({
        success: true,
        data: {
          success: true,
          stock_code: symbol,
          corp_code: null,
          disclosures: [],
          total_count: 0,
          timestamp: new Date().toISOString(),
          source: 'DART API',
          message: '최근 30일 내 공시데이터가 없습니다.'
        }
      })
    }

    // DART API 키 (환경변수 우선, 없으면 폴백 키 사용)
    const dartApiKey = process.env.DART_API_KEY || '5df5d2ce48a5912305d8cb637ca9a4628bb3dae0'

    const bgn_de = getThirtyDaysAgoString()
    const end_de = getTodayString()

    const url = new URL('https://opendart.fss.or.kr/api/list.json')
    url.searchParams.set('crtfc_key', dartApiKey)
    url.searchParams.set('corp_code', corpCode)
    url.searchParams.set('bgn_de', bgn_de)
    url.searchParams.set('end_de', end_de)
    url.searchParams.set('page_no', '1')
    url.searchParams.set('page_count', String(limit))

    // AbortController로 10초 타임아웃 적용
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    let dartData: DartApiResponse
    try {
      const response = await fetch(url.toString(), { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`DART API responded with status ${response.status}`)
      }

      dartData = await response.json() as DartApiResponse
    } catch {
      // DART API 호출 실패 시 빈 배열 반환
      return NextResponse.json({
        success: true,
        data: {
          success: true,
          stock_code: symbol,
          corp_code: corpCode,
          disclosures: [],
          total_count: 0,
          timestamp: new Date().toISOString(),
          source: 'DART API',
          message: '최근 30일 내 공시데이터가 없습니다.'
        }
      })
    }

    // DART API 성공 여부 확인 (status '000' = 정상)
    if (dartData.status !== '000' || !dartData.list) {
      return NextResponse.json({
        success: true,
        data: {
          success: true,
          stock_code: symbol,
          corp_code: corpCode,
          disclosures: [],
          total_count: 0,
          timestamp: new Date().toISOString(),
          source: 'DART API',
          message: '최근 30일 내 공시데이터가 없습니다.'
        }
      })
    }

    // 공시 목록 변환
    const disclosures = dartData.list.map((item: DartDisclosureItem) => ({
      title: item.report_nm,
      company_name: item.corp_name,
      disclosure_date: formatDate(item.rcept_dt),
      filer_name: item.flr_nm,
      category: item.report_nm,
      url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
      receipt_no: item.rcept_no,
      corp_code: corpCode,
      corp_cls: item.corp_cls,
      rm: item.rm || ''
    }))

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        stock_code: symbol,
        corp_code: corpCode,
        disclosures,
        total_count: disclosures.length,
        timestamp: new Date().toISOString(),
        source: 'DART API'
      }
    })

  } catch (error) {
    console.error('Disclosure API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
