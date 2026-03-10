import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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