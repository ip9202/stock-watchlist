'use client'

import { useState, useEffect } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/layout/Footer"
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Calendar, Building } from "lucide-react"
import { formatMarketCapKorean } from "@/lib/utils"
import Link from "next/link"
import { StockChart } from "@/components/chart"

interface StockPageProps {
  params: Promise<{
    symbol: string
  }>
}

// 섹터 번역 함수
const translateSector = (sector: string) => {
  const sectorMap: { [key: string]: string } = {
    'Technology': '기술',
    'Consumer Cyclical': '경기소비재',
    'Consumer Defensive': '필수소비재',
    'Healthcare': '헬스케어',
    'Financial Services': '금융서비스',
    'Communication Services': '통신서비스',
    'Industrials': '산업재',
    'Energy': '에너지',
    'Materials': '소재',
    'Real Estate': '부동산',
    'Utilities': '유틸리티'
  }
  return sectorMap[sector] || sector
}

// 업종 번역 함수
const translateIndustry = (industry: string) => {
  const industryMap: { [key: string]: string } = {
    // 기존 매핑
    'Semiconductors': '반도체',
    'Consumer Electronics': '소비자전자',
    'Auto Manufacturers': '자동차 제조업',
    'Steel': '철강',
    'Chemicals': '화학',
    'Banks - Regional': '지역 은행',
    'Insurance - Life': '생명보험',
    'Telecom Services': '통신 서비스',
    'Internet Content & Information': '인터넷 콘텐츠',
    'Software - Application': '응용 소프트웨어',
    'Drug Manufacturers - General': '제약',
    'Oil & Gas E&P': '석유가스 탐사개발',
    'Construction Materials': '건설자재',
    'Aerospace & Defense': '항공우주 방위산업',
    
    // 추가 한국 업종 매핑
    'Electronic Components': '전자부품',
    'Shipbuilding': '조선',
    'Petrochemicals': '석유화학',
    'Heavy Industries': '중공업',
    'Retail': '소매업',
    'Gaming': '게임',
    'Entertainment': '엔터테인먼트',
    'Cosmetics': '화장품',
    'Food Processing': '식품가공',
    'Textiles': '섬유',
    'Paper & Pulp': '제지',
    'Cement': '시멘트',
    'Glass': '유리',
    'Machinery': '기계',
    'Electrical Equipment': '전기장비',
    'Transportation': '운송',
    'Logistics': '물류',
    'Construction': '건설',
    'Real Estate Development': '부동산 개발',
    'Pharmaceuticals': '의약품',
    'Medical Devices': '의료기기',
    'Biotechnology': '바이오기술',
    'Airlines': '항공',
    'Hotels & Resorts': '호텔리조트',
    'Broadcasting': '방송',
    'Publishing': '출판',
    'Education': '교육',
    'Department Stores': '백화점',
    'Discount Stores': '할인점',
    'Supermarkets': '슈퍼마켓',
    'Online Retail': '온라인 소매',
    'E-commerce': '전자상거래'
  }
  return industryMap[industry] || industry
}

export default function StockPage({ params }: StockPageProps) {
  const [symbol, setSymbol] = useState<string>('')
  const [stockData, setStockData] = useState<any>(null)
  const [newsData, setNewsData] = useState<any>(null)
  const [disclosureData, setDisclosureData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)
  const [disclosureLoading, setDisclosureLoading] = useState(true)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setSymbol(resolvedParams.symbol)
    }
    getParams()
  }, [params])

  // 관심종목 상태 확인
  const checkWatchlistStatus = async () => {
    if (!symbol) return
    
    try {
      const response = await fetch('/api/watchlist')
      const result = await response.json()
      
      if (result.success) {
        const isInList = result.data.some((item: any) => item.symbol === symbol)
        setIsInWatchlist(isInList)
      }
    } catch (error) {
      console.error('Failed to check watchlist status:', error)
    }
  }

  // 관심종목 추가/제거 토글
  const handleWatchlistToggle = async () => {
    if (!symbol || !stockData || watchlistLoading) return
    
    setWatchlistLoading(true)
    
    try {
      if (isInWatchlist) {
        // 관심종목에서 제거
        const watchlistResponse = await fetch('/api/watchlist')
        const watchlistResult = await watchlistResponse.json()
        
        if (watchlistResult.success) {
          const watchlistItem = watchlistResult.data.find((item: any) => item.symbol === symbol)
          
          if (watchlistItem) {
            const deleteResponse = await fetch(`/api/watchlist/${watchlistItem.id}`, {
              method: 'DELETE'
            })
            
            const deleteResult = await deleteResponse.json()
            console.log('Delete result:', deleteResult)
            if (deleteResult.success) {
              setIsInWatchlist(false)
              console.log('Redirecting to home page...')
              // 관심종목에서 삭제 성공 시 메인페이지로 이동
              window.location.href = '/'
              return
            }
          }
        }
      } else {
        // 관심종목에 추가
        const addResponse = await fetch('/api/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            symbol: symbol,
            name: stockData.name
          })
        })
        
        const addResult = await addResponse.json()
        if (addResult.success) {
          setIsInWatchlist(true)
        }
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error)
    } finally {
      setWatchlistLoading(false)
    }
  }

  useEffect(() => {
    if (!symbol) return

    const fetchData = async () => {
      try {
        // 1단계: 주식 기본 데이터 먼저 로딩
        const stockResponse = await fetch(`/api/stocks/${symbol}`, {
          cache: 'no-store'
        })
        const stockResult = await stockResponse.json()
        let companyName = ''
        
        if (stockResult.success) {
          setStockData(stockResult.data)
          companyName = stockResult.data.name
          setLoading(false) // 주가 데이터 로딩 완료
        }
        
        // 2단계: 관심종목 상태 확인 (빠른 DB 조회)
        await checkWatchlistStatus()
        
        // 3단계: 뉴스와 공시는 백그라운드에서 비동기로 로딩
        setTimeout(async () => {
          try {
            const [newsResponse, disclosureResponse] = await Promise.all([
              fetch(`/api/stocks/${symbol}/news?limit=5&name=${encodeURIComponent(companyName)}`, {
                cache: 'no-store'
              }),
              fetch(`/api/stocks/${symbol}/disclosure?limit=5`, {
                cache: 'no-store'
              })
            ])
            
            const newsResult = await newsResponse.json()
            if (newsResult.success) {
              setNewsData(newsResult.data)
            }
            setNewsLoading(false)

            const disclosureResult = await disclosureResponse.json()
            if (disclosureResult.success) {
              setDisclosureData(disclosureResult.data)
            }
            setDisclosureLoading(false)
          } catch (error) {
            console.error('Failed to fetch news/disclosure data:', error)
          }
        }, 100) // 100ms 후 백그라운드 로딩 시작
        
      } catch (error) {
        console.error('Failed to fetch stock data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol])

  // 기본값 설정 (API 실패 시)
  const data = stockData || {
    name: '데이터를 가져올 수 없습니다',
    price: 0,
    changeAmount: 0,
    changePercent: 0,
    volume: 0,
    high: 0,
    low: 0,
    open: 0,
    previousClose: 0,
    marketCap: 'N/A'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 색상 결정
  const getPriceColor = (change: number) => {
    if (change > 0) return 'text-red-600'
    if (change < 0) return 'text-blue-600'
    return 'text-gray-600'
  }

  const priceColor = getPriceColor(data.changeAmount)
  const TrendIcon = data.changeAmount >= 0 ? TrendingUp : TrendingDown

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header - Improved Design */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Navigation */}
            <div className="flex items-center space-x-3 sm:space-x-6">
              <Link href="/">
                <Button variant="ghost" size="sm" className="bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-300 shadow-sm transition-all duration-200">
                  <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">대시보드</span>
                </Button>
              </Link>
            </div>

            {/* Center: Stock Info */}
            <div className="flex items-center justify-center">
              <div className="font-bold text-gray-900 text-xl sm:text-2xl">
                {data.name} ({symbol})
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-gray-500 text-sm">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700 font-medium">실시간</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 text-xs sm:text-sm font-medium shadow-sm transition-all duration-200"
                onClick={handleWatchlistToggle}
              >
                <span className="hidden sm:inline">관심종목 </span>{isInWatchlist ? '제거' : '추가'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Stock Price Card - Gray Minimal */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-lg overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                    <span className="text-lg font-semibold text-gray-900">주가 정보</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-600">실시간</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">PyKRX</span>
                      <span className="text-xs text-gray-400">+</span>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Yahoo Finance</span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-8">
                {/* Company Info and Price Display - Single Row */}
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center justify-between">
                    {/* Left: Company Info */}
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-base sm:text-lg">
                          {data.name ? data.name.charAt(0) : symbol.charAt(0)}
                        </span>
                      </div>
                      <div className="text-left">
                        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate max-w-32 sm:max-w-none">{data.name}</h1>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <p className="text-gray-600 font-medium text-sm sm:text-base">{symbol}</p>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">KRX</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Price Info */}
                    <div className="text-right">
                      <div className="flex items-center justify-end mb-1 sm:mb-2">
                        <span className="text-2xl sm:text-4xl font-bold text-gray-900 mr-1 sm:mr-2">
                          {data.price.toLocaleString()}
                        </span>
                        <span className="text-sm sm:text-lg text-gray-600 font-medium">원</span>
                      </div>
                      <div className={`flex items-center justify-end space-x-1 ${priceColor}`}>
                        <TrendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-sm sm:text-lg font-semibold">
                          {data.changeAmount > 0 ? '+' : ''}{data.changeAmount.toLocaleString()}원
                        </span>
                        <span className="text-xs sm:text-base font-medium">
                          ({data.changePercent > 0 ? '+' : ''}{data.changePercent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1 sm:mb-2 uppercase tracking-wide">거래량</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900">{data.volume.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">주</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1 sm:mb-2 uppercase tracking-wide">시가총액</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900">
                      {data.marketCap && typeof data.marketCap === 'number' 
                        ? formatMarketCapKorean(data.marketCap)
                        : 'N/A'
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">원</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1 sm:mb-2 uppercase tracking-wide">52주 최고</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900">
                      {data.high52w?.toLocaleString() || data.extra_info?.fiftyTwoWeekHigh?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">원</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1 sm:mb-2 uppercase tracking-wide">52주 최저</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900">
                      {data.low52w?.toLocaleString() || data.extra_info?.fiftyTwoWeekLow?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">원</p>
                  </div>
                </div>

                {/* 주가 차트 (SPEC-CHART-001) */}
                <div className="border-t border-gray-200 pt-4 sm:pt-6 mb-4 sm:mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center">
                    <div className="w-1 h-4 bg-green-600 rounded-full mr-2"></div>
                    주가 차트
                  </h4>
                  <StockChart symbol={symbol} />
                </div>

                {/* Daily Price Data */}
                <div className="border-t border-gray-200 pt-4 sm:pt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center">
                    <div className="w-1 h-4 bg-blue-600 rounded-full mr-2"></div>
                    일중 거래 정보
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs sm:text-sm text-gray-600">시가</span>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">
                        {data.open?.toLocaleString() || 'N/A'}원
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs sm:text-sm text-gray-600">고가</span>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">
                        {data.high?.toLocaleString() || 'N/A'}원
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs sm:text-sm text-gray-600">저가</span>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">
                        {data.low?.toLocaleString() || 'N/A'}원
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs sm:text-sm text-gray-600">전일종가</span>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">
                        {data.previousClose?.toLocaleString() || 'N/A'}원
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* News Section - Gray Minimal */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-lg overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                    <span className="text-lg font-semibold text-gray-900">최근 뉴스</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-600">실시간 업데이트</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {newsLoading ? (
                    // 뉴스 로딩 스켈레톤
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="group p-4 sm:p-6 border border-gray-200 rounded-lg animate-pulse">
                          <div className="flex items-start space-x-3 sm:space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-lg"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
                              <div className="h-3 bg-gray-300 rounded mb-3 w-full"></div>
                              <div className="flex space-x-2">
                                <div className="h-3 bg-gray-300 rounded w-20"></div>
                                <div className="h-3 bg-gray-300 rounded w-16"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : newsData && newsData.news && newsData.news.length > 0 ? (
                    <>
                      {newsData.news.map((newsItem: any, index: number) => (
                        <div key={index} className="group p-4 sm:p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 last:mb-0">
                          <div className="flex items-start space-x-3 sm:space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Building className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-2 leading-tight group-hover:text-gray-700 transition-colors text-sm sm:text-base cursor-pointer hover:text-blue-600"
                                  onClick={() => window.open(newsItem.url, '_blank')}>
                                {newsItem.title}
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-600 mb-3 leading-relaxed">
                                {newsItem.description}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                <div className="flex flex-wrap items-center text-xs text-gray-500 gap-2">
                                  <span className="flex items-center bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span className="truncate">{newsItem.published_date}</span>
                                  </span>
                                  <span className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                    <Building className="h-3 w-3 mr-1" />
                                    <span className="truncate">{newsItem.source}</span>
                                  </span>
                                  {newsItem.category && (
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-200">
                                      {newsItem.category}
                                    </span>
                                  )}
                                </div>
                                {newsItem.url && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="bg-white opacity-70 group-hover:opacity-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all self-start sm:self-center"
                                    onClick={() => window.open(newsItem.url, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="text-center pt-6 border-t border-gray-200">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400 transition-all duration-200"
                          onClick={() => window.open(`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(data.name)}`, '_blank')}
                        >
                          더 많은 뉴스 보기
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>뉴스를 불러올 수 없습니다</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-4 sm:space-y-6">
            {/* Company Info */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-lg overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                  <span className="text-lg font-semibold text-gray-900">기업 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4 text-sm">
                  {data.extra_info?.sector && (
                    <div className="bg-purple-50 p-3 rounded border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700 font-medium">섹터</span>
                        <span className="font-bold text-purple-900 text-base">{translateSector(data.extra_info.sector)}</span>
                      </div>
                    </div>
                  )}
                  {data.extra_info?.industry && (
                    <div className="bg-amber-50 p-3 rounded border border-amber-200">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700 font-medium">업종</span>
                        <span className="font-bold text-amber-900 text-base text-right max-w-[60%] truncate">{translateIndustry(data.extra_info.industry)}</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">거래소</span>
                      <span className="font-bold text-gray-900 text-base">{data.extra_info?.exchange || 'KRX'}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">통화</span>
                      <span className="font-bold text-gray-900 text-base">{data.extra_info?.currency || 'KRW'}</span>
                    </div>
                  </div>
                  {data.extra_info?.sharesOutstanding && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 font-medium">발행주식수</span>
                        <span className="font-bold text-blue-900 text-base">
                          {(data.extra_info.sharesOutstanding / 1e6).toFixed(1)}백만주
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Disclosure */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-lg overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                  <span className="text-lg font-semibold text-gray-900">최근 공시</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3">
                  {disclosureLoading ? (
                    // 공시 로딩 스켈레톤
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded border border-gray-200 animate-pulse">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="h-4 bg-gray-300 rounded mb-1 w-3/4"></div>
                              <div className="h-3 bg-gray-300 rounded w-20"></div>
                            </div>
                            <div className="w-8 h-8 bg-gray-300 rounded ml-2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : disclosureData && disclosureData.disclosures && disclosureData.disclosures.length > 0 ? (
                    <>
                      {disclosureData.disclosures.slice(0, 5).map((disclosure: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="mb-1">
                                <p className="font-semibold text-gray-900 text-sm leading-tight">
                                  {disclosure.report_nm || disclosure.title}
                                </p>
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <span>
                                  {disclosure.disclosure_date || disclosure.rcept_dt || disclosure.date}
                                </span>
                              </div>
                            </div>
                            {disclosure.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="bg-white h-8 w-8 p-0 ml-2 opacity-70 hover:opacity-100 text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex-shrink-0"
                                onClick={() => window.open(disclosure.url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-4 bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => window.open(`https://finance.naver.com/item/news.nhn?code=${symbol}`, '_blank')}
                      >
                        전체 공시 보기
                      </Button>
                    </>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded border border-gray-200 text-center">
                      <div className="text-gray-400 text-2xl mb-2">📋</div>
                      <p className="text-sm text-gray-500">
                        {disclosureData?.message || '최근 30일 내 공시데이터가 없습니다.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Community & Analysis - Gray Minimal */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-lg overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                  <span className="text-lg font-semibold text-gray-900">커뮤니티 & 분석</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6 text-sm">
                  {/* Community Activity */}
                  <div>
                    <h4 className="font-semibold mb-2 sm:mb-3 text-gray-700 flex items-center">
                      <div className="w-1 h-4 bg-blue-600 rounded-full mr-2"></div>
                      커뮤니티 활동
                    </h4>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="bg-gray-50 p-3 sm:p-4 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <p className="font-semibold text-gray-900 text-sm">네이버 카페</p>
                          <span className="text-green-700 font-medium bg-green-100 px-2 py-1 rounded text-xs border border-green-200">활발</span>
                        </div>
                        <p className="text-gray-600 text-xs">24시간 언급 45회 · 전일 대비 +12%</p>
                      </div>
                      <div className="bg-gray-50 p-3 sm:p-4 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <p className="font-semibold text-gray-900 text-sm">디시인사이드</p>
                          <span className="text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded text-xs border border-blue-200">증가</span>
                        </div>
                        <p className="text-gray-600 text-xs">24시간 언급 28회 · 전일 대비 +8%</p>
                      </div>
                      <div className="bg-gray-50 p-3 sm:p-4 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <p className="font-semibold text-gray-900 text-sm">투자 블로그</p>
                          <span className="text-purple-700 font-medium bg-purple-100 px-2 py-1 rounded text-xs border border-purple-200">분석</span>
                        </div>
                        <p className="text-gray-600 text-xs">주간 분석글 12개 · 긍정 비율 73%</p>
                      </div>
                    </div>
                  </div>

                  {/* Sentiment Analysis */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-semibold mb-4 text-gray-700 flex items-center">
                      <div className="w-1 h-4 bg-blue-600 rounded-full mr-2"></div>
                      투자 심리
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">긍정 의견</span>
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                            <div className="bg-green-500 h-2 rounded-full" style={{width: '68%'}}></div>
                          </div>
                          <span className="text-green-700 font-semibold text-sm w-10 text-right">68%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">중립 의견</span>
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                            <div className="bg-gray-500 h-2 rounded-full" style={{width: '20%'}}></div>
                          </div>
                          <span className="text-gray-900 font-semibold text-sm w-10 text-right">20%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">부정 의견</span>
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                            <div className="bg-red-500 h-2 rounded-full" style={{width: '12%'}}></div>
                          </div>
                          <span className="text-red-600 font-semibold text-sm w-10 text-right">12%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400 transition-all text-sm"
                      onClick={() => window.open(`https://finance.naver.com/item/board.naver?code=${symbol}`, '_blank')}
                    >
                      네이버 토론실 보기
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400 transition-all text-sm"
                      onClick={() => window.open(`https://gall.dcinside.com/board/lists/?id=stock_new`, '_blank')}
                    >
                      커뮤니티 의견 더보기
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}