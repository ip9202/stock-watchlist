'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { StockSearch } from "@/components/dashboard/StockSearch"
import { WatchlistManager } from "@/components/dashboard/WatchlistManager"
import { Footer } from "@/components/layout/Footer"

export default function DashboardPage() {

  const handleAddStock = async (stock: { symbol: string; name: string; market: string }) => {
    const response = await fetch('/api/watchlist', {
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
      // 페이지 새로고침하여 관심종목 목록 업데이트
      window.location.reload()
    } else {
      console.error('관심종목 추가 실패:', data.error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Stock Watchlist</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8 relative z-50">
          <Card className="bg-white border border-gray-200 overflow-visible">
            <CardHeader className="bg-gray-50 border-b border-gray-200 overflow-visible">
              <CardTitle className="flex items-center space-x-3">
                <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                <span className="text-lg font-semibold text-gray-900">종목 검색</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 overflow-visible">
              <StockSearch onAddStock={handleAddStock} />
            </CardContent>
          </Card>
        </div>

        {/* Watchlist Manager */}
        <WatchlistManager />

      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
