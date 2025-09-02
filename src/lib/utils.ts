import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + "B"
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + "M"
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + "K"
  }
  return num.toString()
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatPercent(num: number): string {
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
}

export function getPriceChangeColor(change: number): string {
  if (change > 0) return "text-red-600"
  if (change < 0) return "text-blue-600"
  return "text-gray-600"
}

export function formatMarketCapKorean(marketCap: number): string {
  if (!marketCap || marketCap === 0) return '-'
  
  const trillion = 1000000000000  // 1조
  const billion = 100000000       // 1억
  
  if (marketCap >= trillion) {
    const value = marketCap / trillion
    return `${value.toFixed(1)}조`
  }
  
  if (marketCap >= billion) {
    const value = marketCap / billion
    return `${value.toFixed(0)}억`
  }
  
  // 1억 미만은 천만 단위로
  if (marketCap >= 10000000) {  // 1천만 이상
    const value = marketCap / 10000000
    return `${value.toFixed(0)}천만`
  }
  
  // 그 외는 기본 숫자 포맷
  return new Intl.NumberFormat('ko-KR').format(marketCap)
}