'use client'

import { useState, useEffect } from 'react'
import { StockCard } from './StockCard'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, RefreshCw } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface WatchlistItem {
  id: string
  symbol: string
  name: string
  order: number
}

interface SearchResult {
  symbol: string
  name: string
  market: string
}

export function WatchlistManager() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 관심종목 목록 불러오기
  const fetchWatchlist = async () => {
    try {
      const response = await apiFetch('/api/watchlist')
      const data = await response.json()
      
      if (data.success) {
        setWatchlist(data.data || [])
      } else {
        console.error('Failed to fetch watchlist:', data.error)
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  // 관심종목 추가
  const addToWatchlist = async (stock: SearchResult) => {
    try {
      const response = await apiFetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        // 성공 시 목록 새로고침
        fetchWatchlist()
        return true
      } else {
        console.error('관심종목 추가 실패:', data.error)
        return false
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      return false
    }
  }

  // 관심종목 제거
  const removeFromWatchlist = async (symbol: string) => {

    try {
      const response = await apiFetch(`/api/watchlist/${watchlist.find(item => item.symbol === symbol)?.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        // 성공 시 목록 새로고침
        fetchWatchlist()
      } else {
        console.error('관심종목 제거 실패:', data.error)
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
  }

  // 새로고침
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchWatchlist()
    setRefreshing(false)
  }

  // 초기 로드
  useEffect(() => {
    fetchWatchlist()
  }, [])

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">내 관심종목</h2>
          <span className="text-sm text-gray-500">로딩 중...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <Card className="bg-white border border-gray-200 mb-6 overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-3 text-gray-900">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              <span className="text-lg font-semibold">내 관심종목</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">{watchlist.length}개 종목</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {watchlist.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 text-lg mb-2">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">관심종목이 없습니다</h3>
          <p className="text-gray-500 mb-4">종목 검색에서 관심종목을 추가해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map((item) => (
            <div key={item.id} className="relative group">
              <StockCard 
                symbol={item.symbol} 
                defaultName={item.name} 
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-3 right-3 p-1.5 h-7 w-7 rounded-full z-10
                          sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity
                          opacity-90 shadow-lg backdrop-blur-sm
                          hover:opacity-100 active:scale-95 transition-all
                          bg-red-500 hover:bg-red-600 border-0"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  removeFromWatchlist(item.symbol)
                }}
                title="관심종목에서 제거"
              >
                <Trash2 className="h-3.5 w-3.5 text-white" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}