'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
// import { Card, CardContent } from '@/components/ui/card'

interface SearchResult {
  symbol: string
  name: string
  market: string
}

interface StockSearchProps {
  onAddStock?: (stock: SearchResult) => void
}

export function StockSearch({ onAddStock }: StockSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // 검색 실행
  const searchStocks = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    setIsLoading(true)
    setShowResults(true) // 로딩 시작할 때 바로 드롭다운 표시
    try {
      const response = await fetch(`/api/stocks?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      
      console.log('API Response:', data) // 디버깅 로그 추가
      
      if (data.success) {
        console.log('Search results:', data.data) // 검색 결과 로그 추가
        setResults(data.data || [])
        // showResults는 이미 true이므로 유지
      } else {
        console.log('Search failed:', data.error) // 실패 로그 추가
        setResults([])
        // 검색 실패해도 결과 없음 메시지를 보여주기 위해 showResults 유지
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      // 오류 발생해도 결과 없음 메시지를 보여주기 위해 showResults 유지
    } finally {
      setIsLoading(false)
    }
  }

  // 디바운싱된 검색 (500ms 지연)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchStocks(query)
    }, 500)

    return () => clearTimeout(timer)
  }, [query])

  // 검색어 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  // 검색 버튼 클릭
  const handleSearch = () => {
    searchStocks(query)
  }

  // 종목 추가
  const handleAddStock = (stock: SearchResult) => {
    onAddStock?.(stock)
    setQuery('')
    setShowResults(false)
    setResults([])
  }

  // 바깥 클릭시 결과 숨김
  const handleBlur = () => {
    // 약간의 지연을 둬서 클릭 이벤트가 실행될 수 있게 함
    setTimeout(() => setShowResults(false), 200)
  }

  return (
    <div className="relative">
      <div className="flex space-x-4">
        <div className="flex-1 relative z-[60]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="종목명 또는 종목코드를 입력하세요 (예: 삼성전자, 005930)"
              className={`pl-10 transition-all duration-200 bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${
                showResults && results.length > 0 
                  ? 'rounded-b-none border-b-0' 
                  : 'rounded-md'
              }`}
              value={query}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onFocus={() => query && setShowResults(true)}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 text-gray-400 animate-spin" />
            )}
          </div>
          
          {/* 검색 결과 드롭다운 - 검색창과 연결 */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 z-[60]">
              <div className={`bg-white border border-gray-200 shadow-lg overflow-hidden ${
                results.length > 0 
                  ? 'border-t-0 rounded-t-none rounded-b-md' 
                  : 'rounded-md mt-1'
              }`}>
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                검색 중...
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                {results.map((stock, index) => (
                  <div
                    key={stock.symbol}
                    className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      index !== results.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                    onClick={() => handleAddStock(stock)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {stock.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {stock.symbol} • {stock.market}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="ml-3 px-2 py-1 h-8 text-xs bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      추가
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                {query ? '검색 결과가 없습니다' : '검색어를 입력해주세요'}
              </div>
              )}
            </div>
          </div>
        )}
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-6"
        >
          검색
        </Button>
      </div>
    </div>
  )
}