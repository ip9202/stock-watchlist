/**
 * 키움증권 REST API 주식 데이터 조회
 * REQ-002: 종목 리스트 조회 전환
 * REQ-003: 개별 종목 시세 조회 전환
 * REQ-004: 데이터 완전성 보장
 *
 * 엔드포인트:
 * - POST https://api.kiwoom.com/api/dostk/stkinfo (주식 정보)
 *   api-id 헤더로 TR 구분: ka10001(현재가시세), ka10099(종목리스트)
 * - POST https://api.kiwoom.com/api/dostk/chart (차트 데이터, SPEC-CHART-001)
 *   api-id 헤더로 TR 구분: ka10081(일봉), ka10082(주봉)
 *   페이지네이션: cont-yn/next-key 응답 헤더 사용
 */

import axios from 'axios'
import KiwoomTokenManager from './kiwoom-token-manager'
import type { ChartData, ChartCandle } from '../types/stock'

// @MX:ANCHOR: 키움 REST API 엔드포인트 - 모든 국내주식 조회에 단일 URL 사용
// @MX:REASON: api-id 헤더로 TR 구분, GET이 아닌 POST 방식

const API_BASE_URL = 'https://api.kiwoom.com'
const STKINFO_ENDPOINT = `${API_BASE_URL}/api/dostk/stkinfo`
// @MX:NOTE: 차트 API 엔드포인트 - 일봉(ka10081), 주봉(ka10082) 조회에 사용
const CHART_ENDPOINT = `${API_BASE_URL}/api/dostk/chart`

const REQUEST_TIMEOUT = 30000 // 30초
// 차트 페이지네이션 최대 횟수 (무한 루프 방지)
const CHART_MAX_PAGES = 5

export interface StockInfo {
  symbol: string
  name: string
  market: string
  search_keywords: string[]
}

export interface StockDetail {
  symbol: string
  name: string | null
  price: number | null
  changeAmount: number | null
  changePercent: number | null
  volume: number | null
  marketCap: number | null
  tradingValue: number | null
  sharesOutstanding: number | null
  volumeRatio: number | null
  high: number | null
  low: number | null
  open: number | null
  previousClose: number | null
  high52w: number | null
  low52w: number | null
}

// ka10099 응답: 종목 리스트
interface KiwoomStockListResponse {
  return_code: number
  return_msg?: string
  list?: Array<{
    code: string       // 종목코드
    name: string       // 종목명
    marketCode: string // "0"=KOSPI, "10"=KOSDAQ
    kind?: string      // "A"=보통주
  }>
}

// ka10001 응답: 개별 종목 현재가 시세 (최상위 필드)
interface KiwoomStockDetailResponse {
  return_code: number
  return_msg?: string
  stk_cd?: string      // 종목코드
  stk_nm?: string      // 종목명
  cur_prc?: string     // 현재가 (+/- 부호 포함, 예: "+190000")
  pred_pre?: string    // 전일대비 (+/- 부호 포함)
  flu_rt?: string      // 등락률 (+/- 부호 포함, 예: "+9.51")
  trde_qty?: string    // 누적거래량
  mac?: string         // 시가총액 (단위: 백만원)
  flo_stk?: string     // 유동주식수 (단위: 주)
  open_pric?: string   // 시가 (+/- 부호 포함)
  high_pric?: string   // 고가 (+/- 부호 포함)
  low_pric?: string    // 저가 (+/- 부호 포함)
  base_pric?: string   // 기준가/전일종가 (부호 없음)
  oyr_hgst?: string    // 52주 최고가 (+/- 부호 포함)
  oyr_lwst?: string    // 52주 최저가 (+/- 부호 포함)
  trde_pre?: string    // 거래량 전일비율 (+/- 부호 포함)
}

// ka10081/ka10082 차트 응답: 개별 캔들 데이터
interface KiwoomChartCandleItem {
  dt?: string       // 날짜 (YYYYMMDD)
  opnprc?: string   // 시가
  hgprc?: string    // 고가
  lwprc?: string    // 저가
  clsprc?: string   // 종가
  trde_qty?: string // 거래량
}

// ka10081/ka10082 차트 응답
interface KiwoomChartResponse {
  return_code: number
  return_msg?: string
  output?: KiwoomChartCandleItem[]
}

export class KiwoomStockAPI {
  private appKey: string
  private secretKey: string

  constructor() {
    this.appKey = process.env.KIWOOM_APP_KEY || ''
    this.secretKey = process.env.KIWOOM_SECRET_KEY || ''

    if (!this.appKey || !this.secretKey) {
      throw new Error('KIWOOM_APP_KEY와 KIWOOM_SECRET_KEY 환경변수가 필요합니다')
    }
  }

  /**
   * 전체 종목 리스트 조회 (REQ-002)
   * TR: ka10099 - 전체 종목 리스트
   * @param market - 시장 구분 ('KOSPI', 'KOSDAQ', 'ALL')
   */
  async fetchStockList(market: 'KOSPI' | 'KOSDAQ' | 'ALL' = 'ALL'): Promise<StockInfo[]> {
    const allStocks: StockInfo[] = []

    if (market === 'ALL' || market === 'KOSPI') {
      const kospiStocks = await this.fetchMarketStocks('KOSPI')
      allStocks.push(...kospiStocks)
    }

    if (market === 'ALL' || market === 'KOSDAQ') {
      const kosdaqStocks = await this.fetchMarketStocks('KOSDAQ')
      allStocks.push(...kosdaqStocks)
    }

    return allStocks
  }

  /**
   * 개별 종목 시세 조회 (REQ-003, REQ-004)
   * TR: ka10001 - 주식현재가시세
   * @param symbol - 종목코드
   */
  async fetchStockDetail(symbol: string): Promise<StockDetail> {
    if (!symbol) {
      throw new Error('종목코드는 필수입니다')
    }

    const token = await KiwoomTokenManager.getInstance().getAccessToken()

    try {
      const response = await axios.post<KiwoomStockDetailResponse>(
        STKINFO_ENDPOINT,
        { stk_cd: symbol },
        {
          headers: this.createHeaders(token, 'ka10001'),
          timeout: REQUEST_TIMEOUT
        }
      )

      const result = response.data

      if (result.return_code !== 0) {
        throw new Error(`종목 시세 조회 실패: ${result.return_msg || '알 수 없는 에러'}`)
      }

      // @MX:NOTE: 부호 포함 문자열 처리 - "+190000" → 190000, "-52500" → 52500 (절대값)
      const price = this.parseSignedNumber(result.cur_prc)
      const volume = this.parseNumber(result.trde_qty)

      // tradingValue: 직접 필드 없음 → trde_qty × abs(cur_prc) 계산 (REQ-004)
      const tradingValue = price !== null && volume !== null ? price * volume : null

      return {
        symbol,
        name: result.stk_nm || null,
        price,
        changeAmount: this.parseSignedNumber(result.pred_pre),
        changePercent: this.parseSignedNumber(result.flu_rt),
        volume,
        marketCap: this.parseNumber(result.mac),
        tradingValue,
        sharesOutstanding: this.parseNumber(result.flo_stk),
        volumeRatio: this.parseSignedNumber(result.trde_pre),
        high: this.parseSignedNumber(result.high_pric),
        low: this.parseSignedNumber(result.low_pric),
        open: this.parseSignedNumber(result.open_pric),
        previousClose: this.parseNumber(result.base_pric),
        high52w: this.parseSignedNumber(result.oyr_hgst),
        low52w: this.parseSignedNumber(result.oyr_lwst)
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('알 수 없는 에러가 발생했습니다')
    }
  }

  /**
   * 차트 데이터 조회 (SPEC-CHART-001)
   * TR: ka10081(일봉), ka10082(주봉)
   * @param symbol - 종목코드
   * @param apiId - TR ID (ka10081: 일봉, ka10082: 주봉)
   * @param params - 조회 파라미터 (from, to, reqCnt)
   */
  async fetchChart(
    symbol: string,
    apiId: string,
    params: { from?: string; to?: string; reqCnt?: string }
  ): Promise<ChartData> {
    const token = await KiwoomTokenManager.getInstance().getAccessToken()

    // 기간 매핑: ka10081 → daily, ka10082 → weekly
    const period: 'daily' | 'weekly' = apiId === 'ka10082' ? 'weekly' : 'daily'

    const allCandles: ChartCandle[] = []
    let contYn = 'Y'
    let nextKey = ''
    let pageCount = 0

    while (contYn === 'Y' && pageCount < CHART_MAX_PAGES) {
      // 요청 본문 구성
      const requestBody: Record<string, string> = {
        stk_cd: symbol,
        req_cnt: params.reqCnt || '100'
      }
      if (params.from) requestBody['from'] = params.from
      if (params.to) requestBody['to'] = params.to
      // 페이지네이션: 두 번째 요청부터 next_key 포함
      if (nextKey) requestBody['next_key'] = nextKey

      const response = await axios.post(
        CHART_ENDPOINT,
        requestBody,
        {
          headers: this.createHeaders(token, apiId),
          timeout: REQUEST_TIMEOUT
        }
      )

      const result = response.data as KiwoomChartResponse
      if (result.return_code !== 0) {
        throw new Error(`차트 데이터 조회 실패: ${result.return_msg || '알 수 없는 에러'}`)
      }

      // 캔들 데이터 변환
      const outputList: KiwoomChartCandleItem[] = result.output || []
      const candles = outputList.map(item => this.transformChartCandle(item))
      allCandles.push(...candles)

      // 페이지네이션 헤더 확인
      const responseHeaders = response.headers || {}
      contYn = responseHeaders['cont-yn'] || 'N'
      nextKey = responseHeaders['next-key'] || ''
      pageCount++
    }

    return {
      symbol,
      period,
      candles: allCandles
    }
  }

  /**
   * 차트 캔들 데이터 변환
   * @MX:NOTE: parseSignedNumber 미사용 - 차트 가격은 절대값, 부호 처리 불필요
   */
  private transformChartCandle(item: KiwoomChartCandleItem): ChartCandle {
    // 날짜 변환: YYYYMMDD → YYYY-MM-DD
    const rawDate = item.dt || ''
    const date = rawDate.length === 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : rawDate

    return {
      date,
      open: this.parseNumber(item.opnprc) ?? 0,
      high: this.parseNumber(item.hgprc) ?? 0,
      low: this.parseNumber(item.lwprc) ?? 0,
      close: this.parseNumber(item.clsprc) ?? 0,
      volume: this.parseNumber(item.trde_qty) ?? 0
    }
  }

  /**
   * 종목 검색
   */
  searchStocks(query: string, stocks: StockInfo[], limit: number = 20): StockInfo[] {
    if (!query || !stocks.length) {
      return []
    }

    const normalizedQuery = query.toLowerCase().trim()
    const results: Array<StockInfo & { score: number }> = []

    for (const stock of stocks) {
      let score = 0

      if (normalizedQuery === stock.symbol) {
        score = 100
      } else if (stock.symbol.includes(normalizedQuery)) {
        score = Math.max(score, 90)
      }

      const normalizedName = stock.name.toLowerCase()
      if (normalizedQuery === normalizedName) {
        score = Math.max(score, 85)
      } else if (normalizedName.startsWith(normalizedQuery)) {
        score = Math.max(score, 80)
      } else if (normalizedName.includes(normalizedQuery)) {
        score = Math.max(score, 70)
      }

      for (const keyword of stock.search_keywords) {
        const normalizedKeyword = keyword.toLowerCase()
        if (normalizedQuery === normalizedKeyword) {
          score = Math.max(score, 75)
          break
        } else if (normalizedKeyword.includes(normalizedQuery)) {
          score = Math.max(score, 65)
        }
      }

      if (score > 0) {
        results.push({ ...stock, score })
      }
    }

    results.sort((a, b) => b.score - a.score)

    const uniqueResults: StockInfo[] = []
    const seenSymbols = new Set<string>()

    for (const result of results) {
      if (!seenSymbols.has(result.symbol)) {
        uniqueResults.push({
          symbol: result.symbol,
          name: result.name,
          market: result.market,
          search_keywords: result.search_keywords
        })
        seenSymbols.add(result.symbol)
      }
    }

    return uniqueResults.slice(0, limit)
  }

  /**
   * 특정 시장 종목 조회 (ka10099)
   * mrkt_tp: "0"=KOSPI, "10"=KOSDAQ
   */
  private async fetchMarketStocks(market: 'KOSPI' | 'KOSDAQ'): Promise<StockInfo[]> {
    const token = await KiwoomTokenManager.getInstance().getAccessToken()
    const mrktTp = market === 'KOSPI' ? '0' : '10'

    try {
      const response = await axios.post<KiwoomStockListResponse>(
        STKINFO_ENDPOINT,
        { mrkt_tp: mrktTp },
        {
          headers: this.createHeaders(token, 'ka10099'),
          timeout: REQUEST_TIMEOUT
        }
      )

      const result = response.data

      if (result.return_code !== 0) {
        throw new Error(`종목 리스트 조회 실패: ${result.return_msg || '알 수 없는 에러'}`)
      }

      const list = result.list || []
      return list
        .filter(item => item.kind === 'A' || !item.kind) // 보통주만 (ETF 등 제외 옵션)
        .map(item => ({
          symbol: item.code,
          name: item.name,
          market,
          search_keywords: [item.code, item.name, market.toLowerCase()]
        }))
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('알 수 없는 에러가 발생했습니다')
    }
  }

  /**
   * API 요청 헤더 생성
   * @param apiId - TR ID (ka10001, ka10099 등)
   */
  private createHeaders(token: string, apiId: string) {
    return {
      'Content-Type': 'application/json;charset=UTF-8',
      'Authorization': `Bearer ${token}`,
      'appkey': this.appKey,
      'appsecret': this.secretKey,
      'api-id': apiId
    }
  }

  /**
   * 부호 포함 문자열을 절대값 숫자로 파싱 (REQ-004)
   * "+190000" → 190000, "-52500" → 52500, "-0" → 0
   */
  private parseSignedNumber(value: string | undefined): number | null {
    if (value === undefined || value === null || value === '') {
      return null
    }
    const cleaned = value.replace(/,/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : Math.abs(num)
  }

  /**
   * 일반 숫자 문자열 파싱 (부호 없음, REQ-004)
   * "173500" → 173500, "0000000027931470" → 27931470
   */
  private parseNumber(value: string | undefined): number | null {
    if (value === undefined || value === null || value === '') {
      return null
    }
    const cleaned = value.replace(/,/g, '')
    const parsed = cleaned.includes('.') ? parseFloat(cleaned) : parseInt(cleaned, 10)
    return isNaN(parsed) ? null : parsed
  }
}

export default KiwoomStockAPI
