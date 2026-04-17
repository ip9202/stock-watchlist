import { DiscoveryPanel } from '@/components/discovery/DiscoveryPanel'

/**
 * AI 발견 페이지
 * AI가 발견한 종목 목록을 표시
 */
export default function DiscoveryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <DiscoveryPanel />
      </div>
    </div>
  )
}
