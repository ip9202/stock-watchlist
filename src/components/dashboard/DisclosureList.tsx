'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText, Calendar, Building2, RefreshCw } from "lucide-react"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface DisclosureItem {
  rcept_no: string
  rcept_dt: string
  report_nm: string
  corp_name: string
  flr_nm: string
  rm: string
  url: string
}

interface DisclosureListProps {
  symbols?: string[]
  title?: string
  maxItems?: number
}

export function DisclosureList({ 
  symbols = [], 
  title = "최근 공시정보", 
  maxItems = 20 
}: DisclosureListProps) {
  const [disclosures, setDisclosures] = useState<DisclosureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDisclosures = async () => {
    try {
      setError(null)
      
      if (symbols.length === 0) {
        setDisclosures([])
        setLoading(false)
        return
      }

      const response = await fetch('/api/disclosures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchlistSymbols: symbols,
          days: 14
        }),
      })

      const result = await response.json()
      
      if (result.success && result.data) {
        // 모든 종목의 공시정보를 하나의 배열로 합치기
        const allDisclosures: DisclosureItem[] = []
        
        Object.values(result.data).forEach((symbolData: any) => {
          if (symbolData.success && symbolData.disclosures) {
            allDisclosures.push(...symbolData.disclosures)
          }
        })

        // 날짜순으로 정렬 (최신순) - 안전한 정렬
        const sortedDisclosures = allDisclosures
          .filter(item => item && (item.rcept_dt || item.disclosure_date)) // 유효한 데이터만 필터링
          .sort((a, b) => {
            const dateA = a.rcept_dt || a.disclosure_date || '0'
            const dateB = b.rcept_dt || b.disclosure_date || '0'
            return dateB.localeCompare(dateA)
          })
          .slice(0, maxItems)

        setDisclosures(sortedDisclosures)
      } else {
        setError(result.error || '공시정보를 가져올 수 없습니다')
      }
    } catch (err) {
      console.error('Disclosure fetch error:', err)
      setError('공시정보 조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDisclosures()
  }

  useEffect(() => {
    fetchDisclosures()
  }, [symbols])

  const formatDate = (dateStr: string) => {
    try {
      // YYYYMMDD 형식을 Date로 변환
      const year = parseInt(dateStr.substring(0, 4))
      const month = parseInt(dateStr.substring(4, 6)) - 1
      const day = parseInt(dateStr.substring(6, 8))
      const date = new Date(year, month, day)
      
      return format(date, 'MM.dd', { locale: ko })
    } catch {
      return dateStr
    }
  }

  const getReportTypeColor = (reportName: string) => {
    if (reportName.includes('사업보고서')) return 'bg-blue-100 text-blue-800'
    if (reportName.includes('분기보고서')) return 'bg-green-100 text-green-800'
    if (reportName.includes('반기보고서')) return 'bg-purple-100 text-purple-800'
    if (reportName.includes('주요사항보고서')) return 'bg-red-100 text-red-800'
    if (reportName.includes('지분변동신고서')) return 'bg-orange-100 text-orange-800'
    if (reportName.includes('투자판단참고사항')) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const truncateTitle = (title: string, maxLength: number = 50) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center space-x-3">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <span className="text-lg font-semibold text-gray-900">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border border-gray-200 overflow-hidden">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <span className="text-lg font-semibold text-gray-900">{title}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 font-normal">
              {disclosures.length}건
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">{error}</p>
          </div>
        ) : disclosures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">최근 공시정보가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disclosures.map((disclosure) => (
              <div
                key={disclosure.rcept_no}
                className="border-l-4 border-blue-200 pl-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getReportTypeColor(disclosure.report_nm || disclosure.title || '')}`}
                      >
                        {((disclosure.report_nm || disclosure.title || '').length > 15) 
                          ? (disclosure.report_nm || disclosure.title || '').substring(0, 15) + '...'
                          : (disclosure.report_nm || disclosure.title || '')
                        }
                      </Badge>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(disclosure.rcept_dt || disclosure.disclosure_date || '')}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium truncate text-gray-900">
                        {disclosure.corp_name || disclosure.company_name || ''}
                      </span>
                    </div>
                    
                    {disclosure.rm && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {truncateTitle(disclosure.rm, 80)}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => window.open(disclosure.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}