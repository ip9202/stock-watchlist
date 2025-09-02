'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { formatMarketCapKorean } from "@/lib/utils"
import Link from "next/link"

interface StockData {
  symbol: string
  name: string
  price: number
  changeAmount: number
  changePercent: number
  volume: number
  marketCap: string | number
  timestamp?: string
}

interface StockCardProps {
  symbol: string
  defaultName?: string
}

export function StockCard({ symbol, defaultName = "로딩 중..." }: StockCardProps) {
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true)
        setError(false)
        
        // 주식 정보 요청만 (공시 정보는 하단 섹션에서만 표시)
        const stockResponse = await fetch(`/api/stocks/${symbol}`)
        const stockResult = await stockResponse.json()
        
        if (stockResult.success && stockResult.data) {
          setData(stockResult.data)
        } else {
          setError(true)
        }
        
      } catch (err) {
        console.error('Stock data fetch error:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    // 초기 로드
    fetchStockData()

    // 5분마다 자동 새로고침
    const interval = setInterval(() => {
      fetchStockData()
    }, 5 * 60 * 1000) // 5분 = 300초

    return () => clearInterval(interval)
  }, [symbol])

  // 색상 결정
  const getPriceColor = (change: number) => {
    if (change > 0) return 'text-red-600'
    if (change < 0) return 'text-blue-600'
    return 'text-gray-600'
  }

  const priceColor = data ? getPriceColor(data.changeAmount) : 'text-gray-600'
  const TrendIcon = data && data.changeAmount >= 0 ? TrendingUp : TrendingDown

  if (loading) {
    return (
      <Card className="hover:shadow-md transition-shadow bg-white border border-gray-200 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 to-gray-400 animate-pulse"></div>
        <CardHeader className="pb-2 pr-12">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                <CardTitle className="text-lg truncate pr-2 text-gray-900">{defaultName}</CardTitle>
              </div>
              <span className="text-sm text-gray-500 font-mono">{symbol}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-gray-500">데이터 로딩 중...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="hover:shadow-md transition-shadow bg-white border border-red-200 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-orange-400"></div>
        <CardHeader className="pb-2 pr-12">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <CardTitle className="text-lg truncate pr-2 text-gray-900">{defaultName}</CardTitle>
              </div>
              <span className="text-sm text-gray-500 font-mono">{symbol}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <p className="text-sm font-medium">데이터 조회 실패</p>
            </div>
            <p className="text-xs text-gray-400">잠시 후 다시 시도해주세요</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // 삭제 버튼 클릭 시 링크 이동 방지
    if ((e.target as HTMLElement).closest('button')) {
      e.preventDefault()
      return
    }
  }

  return (
    <Link href={`/stock/${symbol}`} onClick={handleCardClick}>
      <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white border border-gray-200 overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600"></div>
        <CardHeader className="pb-2 pr-12 relative">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <CardTitle className="text-lg truncate pr-2 text-gray-900 group-hover:text-blue-700 transition-colors">{data.name}</CardTitle>
              </div>
              <span className="text-sm text-gray-500 font-mono">{symbol}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">{data.price.toLocaleString()}원</span>
              <div className={`flex items-center px-2 py-1 rounded-full ${priceColor} ${data.changeAmount >= 0 ? 'bg-red-50' : 'bg-blue-50'} transition-colors`}>
                <TrendIcon className="h-4 w-4 mr-1" />
                <span className="text-sm font-semibold">
                  {data.changeAmount > 0 ? '+' : ''}{data.changeAmount.toLocaleString()} ({data.changeAmount > 0 ? '+' : ''}{data.changePercent}%)
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                  <div>
                    <p className="text-xs text-gray-400">거래량</p>
                    <p className="font-semibold text-gray-700">{data.volume.toLocaleString()}주</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-purple-400"></div>
                  <div>
                    <p className="text-xs text-gray-400">시가총액</p>
                    <p className="font-semibold text-gray-700">
                      {typeof data.marketCap === 'number' 
                        ? formatMarketCapKorean(data.marketCap)
                        : data.marketCap
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-500"></div>
                  <p className="text-xs text-gray-400 font-mono">
                    {data.timestamp ? new Date(data.timestamp).toLocaleString('ko-KR', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Yahoo Finance'}
                  </p>
                </div>
                <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  클릭하여 상세보기 →
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}