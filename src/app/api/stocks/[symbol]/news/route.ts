import { NextRequest, NextResponse } from 'next/server'

// 뉴스 아이템 타입 정의
interface NewsItem {
  title: string
  description: string
  url: string
  published_date: string
  source: string
}

// HTML 태그 제거 헬퍼 함수
function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '')
}

// 샘플 뉴스 데이터 (API 키 미설정 또는 API 실패 시 폴백)
function getSampleNews(symbol: string, companyName: string): NewsItem[] {
  const query = encodeURIComponent(companyName || symbol)
  return [
    {
      title: `${companyName || symbol} 관련 최신 뉴스`,
      description: '네이버 뉴스에서 관련 기사를 확인하세요.',
      url: `https://search.naver.com/search.naver?where=news&query=${query}+주식`,
      published_date: new Date().toUTCString(),
      source: '네이버 뉴스'
    },
    {
      title: `${companyName || symbol} 주가 동향`,
      description: '최신 주가 동향 및 시장 분석을 확인하세요.',
      url: `https://search.naver.com/search.naver?where=news&query=${query}+주가`,
      published_date: new Date().toUTCString(),
      source: '네이버 뉴스'
    },
    {
      title: `${companyName || symbol} 실적 분석`,
      description: '분기별 실적 및 재무 분석 정보를 확인하세요.',
      url: `https://search.naver.com/search.naver?where=news&query=${query}+실적`,
      published_date: new Date().toUTCString(),
      source: '네이버 뉴스'
    },
    {
      title: `${companyName || symbol} 투자 정보`,
      description: '기관 투자자 동향 및 투자 분석을 확인하세요.',
      url: `https://search.naver.com/search.naver?where=news&query=${query}+투자`,
      published_date: new Date().toUTCString(),
      source: '네이버 뉴스'
    },
    {
      title: `${companyName || symbol} 업계 동향`,
      description: '관련 업계 뉴스 및 시장 동향을 확인하세요.',
      url: `https://search.naver.com/search.naver?where=news&query=${query}+업계`,
      published_date: new Date().toUTCString(),
      source: '네이버 뉴스'
    }
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const name = searchParams.get('name') || ''

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Stock symbol is required'
      }, { status: 400 })
    }

    const companyName = name || symbol
    // 네이버 뉴스 API 검색 쿼리: "회사명 주식"
    const query = `${companyName} 주식`

    const naverClientId = process.env.NAVER_CLIENT_ID
    const naverClientSecret = process.env.NAVER_CLIENT_SECRET

    // API 키가 설정되지 않은 경우 샘플 데이터 반환
    if (!naverClientId || !naverClientSecret) {
      const sampleNews = getSampleNews(symbol, companyName)
      return NextResponse.json({
        success: true,
        data: {
          success: true,
          symbol,
          company_name: companyName,
          news: sampleNews.slice(0, limit),
          total_count: sampleNews.length,
          timestamp: new Date().toISOString()
        }
      })
    }

    // 10초 타임아웃 설정
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      // 네이버 뉴스 API 호출
      const naverApiUrl = new URL('https://openapi.naver.com/v1/search/news.json')
      naverApiUrl.searchParams.set('query', query)
      naverApiUrl.searchParams.set('display', String(Math.min(limit, 100)))
      naverApiUrl.searchParams.set('start', '1')
      naverApiUrl.searchParams.set('sort', 'date')

      const response = await fetch(naverApiUrl.toString(), {
        method: 'GET',
        headers: {
          'X-Naver-Client-Id': naverClientId,
          'X-Naver-Client-Secret': naverClientSecret
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // API 실패 시 샘플 데이터로 폴백
        const sampleNews = getSampleNews(symbol, companyName)
        return NextResponse.json({
          success: true,
          data: {
            success: true,
            symbol,
            company_name: companyName,
            news: sampleNews.slice(0, limit),
            total_count: sampleNews.length,
            timestamp: new Date().toISOString()
          }
        })
      }

      const apiData = await response.json()
      const items = apiData.items || []

      // 응답 아이템을 뉴스 아이템 형식으로 변환
      const news: NewsItem[] = items.map((item: {
        title: string
        description: string
        link: string
        pubDate: string
      }) => ({
        title: stripHtml(item.title),
        description: stripHtml(item.description),
        url: item.link,
        published_date: item.pubDate,
        source: '네이버 뉴스'
      }))

      return NextResponse.json({
        success: true,
        data: {
          success: true,
          symbol,
          company_name: companyName,
          news,
          total_count: news.length,
          timestamp: new Date().toISOString()
        }
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      // 네트워크 오류 또는 타임아웃 시 샘플 데이터로 폴백
      const sampleNews = getSampleNews(symbol, companyName)
      return NextResponse.json({
        success: true,
        data: {
          success: true,
          symbol,
          company_name: companyName,
          news: sampleNews.slice(0, limit),
          total_count: sampleNews.length,
          timestamp: new Date().toISOString()
        }
      })
    }

  } catch (error) {
    console.error('News API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
