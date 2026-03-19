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
import type { ChartData, ChartCandle, MarketIndex } from '../types/stock'

// @MX:ANCHOR: 키움 REST API 엔드포인트 - 모든 국내주식 조회에 단일 URL 사용
// @MX:REASON: api-id 헤더로 TR 구분, GET이 아닌 POST 방식

const API_BASE_URL = 'https://api.kiwoom.com'
const STKINFO_ENDPOINT = `${API_BASE_URL}/api/dostk/stkinfo`
// @MX:NOTE: 차트 API 엔드포인트 - 일봉(ka10081), 주봉(ka10082) 조회에 사용
const CHART_ENDPOINT = `${API_BASE_URL}/api/dostk/chart`
// @MX:NOTE: 업종 현재가 엔드포인트 - KOSPI/KOSDAQ 지수 조회 (ka20001)
// /api/dostk/stkpc가 아닌 /api/dostk/sect가 올바른 경로
const SECT_ENDPOINT = `${API_BASE_URL}/api/dostk/sect`

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

// 차트 응답: 개별 캔들 데이터 (일봉/주봉/월봉: dt, 분봉: cntr_tm)
interface KiwoomChartCandleItem {
  dt?: string         // 날짜 (YYYYMMDD, 일봉/주봉/월봉)
  cntr_tm?: string    // 체결시간 (YYYYMMDDHHMMSS, 분봉 전용)
  open_pric?: string  // 시가 (분봉은 부호 포함)
  high_pric?: string  // 고가 (분봉은 부호 포함)
  low_pric?: string   // 저가 (분봉은 부호 포함)
  cur_prc?: string    // 종가/현재가 (분봉은 부호 포함)
  trde_qty?: string   // 거래량
}

// 차트 응답 (API별 응답 배열 키가 다름)
// ka10080: 분봉(키 미확인), ka10081: stk_dt_pole_chart_qry, ka10082: stk_stk_pole_chart_qry, ka10083: stk_mth_pole_chart_qry
// 패턴: stk_*_pole_chart_qry
interface KiwoomChartResponse {
  return_code?: number
  return_msg?: string
  stk_cd?: string
  [key: string]: unknown
}

// ka20001 응답: 업종 현재가 조회 (KOSPI/KOSDAQ 지수)
interface KiwoomIndexInfoResponse {
  return_code?: number
  return_msg?: string
  inds_cd?: string     // 업종코드
  inds_nm?: string     // 업종명
  cur_prc?: string     // 현재지수 (부호 포함)
  pred_pre?: string    // 전일대비 (부호 포함)
  flu_rt?: string      // 등락률 (부호 포함, 예: "+1.23")
  [key: string]: unknown
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
   * 토큰 에러 시 자동 재시도 래퍼 (REQ-U02, REQ-E03, REQ-E04, REQ-N01, REQ-N02)
   * [8005] 토큰 에러 시 invalidateToken + 새 토큰으로 1회 재시도
   * 비토큰 에러는 즉시 throw
   */
  private async requestWithTokenRetry<T>(
    requestFn: (token: string) => Promise<T>
  ): Promise<T> {
    // 토큰 발급
    const token = await KiwoomTokenManager.getInstance().getAccessToken()
    try {
      return await requestFn(token)
    } catch (error) {
      // [8005] 토큰 에러만 재시도 (REQ-E03, REQ-N01)
      if (KiwoomTokenManager.isTokenError(error)) {
        // 토큰 무효화 후 새 토큰으로 1회 재시도 (REQ-U02)
        KiwoomTokenManager.getInstance().invalidateToken()
        const newToken = await KiwoomTokenManager.getInstance().getAccessToken()
        return requestFn(newToken)
      }
      // 비토큰 에러는 즉시 throw (REQ-N01, REQ-N02)
      throw error
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

    // requestWithTokenRetry로 [8005] 에러 시 자동 재시도 (Task 4)
    return this.requestWithTokenRetry(async (token) => {
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

      // @MX:NOTE: 현재가는 절대값으로 파싱 - "+190000" → 190000, "-52500" → 52500
      const price = this.parseAbsolutePrice(result.cur_prc)
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
        volumeRatio: this.parseAbsolutePrice(result.trde_pre),
        high: this.parseAbsolutePrice(result.high_pric),
        low: this.parseAbsolutePrice(result.low_pric),
        open: this.parseAbsolutePrice(result.open_pric),
        previousClose: this.parseNumber(result.base_pric),
        high52w: this.parseAbsolutePrice(result.oyr_hgst),
        low52w: this.parseAbsolutePrice(result.oyr_lwst)
      }
    })
  }

  /**
   * 업종 현재가 조회 (SPEC-MARKET-001)
   * TR: ka20001 - 업종 현재가
   * @param indsCd - 업종코드 ('0001'=KOSPI, '1001'=KOSDAQ)
   */
  async fetchIndexInfo(indsCd: string): Promise<MarketIndex> {
    // 업종코드 → 이름/시장구분 매핑
    // 키움 업종코드: 001=코스피종합, 101=코스닥종합 (3자리)
    const indexConfig: Record<string, { name: string; mrktTp: string }> = {
      '001': { name: 'KOSPI', mrktTp: '0' },
      '101': { name: 'KOSDAQ', mrktTp: '1' },
    }
    const config = indexConfig[indsCd]
    const mrktTp = config?.mrktTp ?? '0'

    return this.requestWithTokenRetry(async (token) => {
      const response = await axios.post<KiwoomIndexInfoResponse>(
        SECT_ENDPOINT,
        { mrkt_tp: mrktTp, inds_cd: indsCd },
        {
          headers: this.createHeaders(token, 'ka20001'),
          timeout: REQUEST_TIMEOUT
        }
      )

      const result = response.data

      // return_code가 있고 0이 아닌 경우 에러
      if (result.return_code !== undefined && result.return_code !== 0) {
        throw new Error(`업종 현재가 조회 실패: ${result.return_msg || '알 수 없는 에러'}`)
      }

      // 지수값은 절대값, 변동폭/등락률은 부호 보존 (하락 시 음수)
      const value = this.parseAbsolutePrice(result.cur_prc) ?? 0
      const change = this.parseSignedNumber(result.pred_pre) ?? 0
      const changePercent = this.parseSignedNumber(result.flu_rt) ?? 0

      return {
        code: indsCd,
        name: config?.name || result.inds_nm || indsCd,
        value,
        change,
        changePercent,
      }
    })
  }

  /**
   * 업종 차트 데이터 조회 (SPEC-MARKET-001)
   * TR: ka20005(분봉), ka20006(일봉)
   * @param indsCd - 업종코드 ('0001'=KOSPI, '1001'=KOSDAQ)
   * @param period - 'minute' 또는 'daily'
   * @param from - 조회 시작일 (YYYYMMDD)
   * @param to - 조회 종료일/기준일 (YYYYMMDD)
   * @param ticScope - 분봉 단위 (분봉일 때만 사용)
   */
  async fetchIndexChart(
    indsCd: string,
    period: string,
    from: string,
    to: string,
    ticScope?: string
  ): Promise<ChartCandle[]> {
    const apiId = period === 'minute' ? 'ka20005' : 'ka20006'
    const allCandles: ChartCandle[] = []
    let contYn = 'Y'
    let nextKey = ''
    let pageCount = 0

    while (contYn === 'Y' && pageCount < CHART_MAX_PAGES) {
      const requestBody: Record<string, string> = {
        inds_cd: indsCd,
        base_dt: to,
        upd_stkpc_tp: '1',
      }
      // 분봉 요청 시 tic_scope 파라미터 추가
      if (period === 'minute' && ticScope) requestBody['tic_scope'] = ticScope

      const currentContYn = pageCount === 0 ? 'N' : 'Y'
      const currentNextKey = nextKey
      const currentBody = { ...requestBody }

      const response = await this.requestWithTokenRetry(async (token) =>
        axios.post(
          CHART_ENDPOINT,
          currentBody,
          {
            headers: {
              ...this.createHeaders(token, apiId),
              'cont-yn': currentContYn,
              'next-key': currentNextKey,
            },
            timeout: REQUEST_TIMEOUT
          }
        )
      )

      const result = response.data as KiwoomChartResponse
      // return_code가 존재하고 0이 아닌 경우 에러
      if (result.return_code !== undefined && result.return_code !== 0) {
        throw new Error(`업종 차트 조회 실패: ${result.return_msg || '알 수 없는 에러'}`)
      }

      // 캔들 데이터 추출 (stk_*_pole_chart_qry 패턴 재사용)
      const outputList: KiwoomChartCandleItem[] = this.extractChartCandles(result)
      const candles = outputList.map(item => this.transformChartCandle(item))
      allCandles.push(...candles)

      // from 날짜 기반 페이지네이션 중단
      if (from && candles.length > 0) {
        const oldestDate = candles[candles.length - 1].date.replace(/[-T:]/g, '').slice(0, 8)
        if (oldestDate <= from) break
      }

      const responseHeaders = response.headers || {}
      contYn = responseHeaders['cont-yn'] || 'N'
      nextKey = responseHeaders['next-key'] || ''
      pageCount++
    }

    // from 날짜 이전 데이터 필터링
    const filteredCandles = from
      ? allCandles.filter(c => {
          const candleDate = c.date.replace(/[-T:]/g, '').slice(0, 8)
          return candleDate >= from
        })
      : allCandles

    // 분봉(minute) 데이터: 가장 최근 거래일 데이터만 유지
    // 장외 시간이나 주말에도 직전 거래일 차트를 볼 수 있도록
    const resultCandles = period === 'minute' && filteredCandles.length > 0
      ? this.filterLatestTradingDay(filteredCandles)
      : filteredCandles

    // 업종 지수 가격은 100배 스케일 (564048 → 5640.48)
    return resultCandles.map(c => ({
      ...c,
      open: c.open / 100,
      high: c.high / 100,
      low: c.low / 100,
      close: c.close / 100,
    }))
  }

  /**
   * 차트 데이터 조회 (SPEC-CHART-001)
   * TR: ka10081(일봉), ka10082(주봉)
   * @param symbol - 종목코드
   * @param apiId - TR ID (ka10081: 일봉, ka10082: 주봉)
   * @param params - 조회 파라미터 (from, to, ticScope)
   */
  async fetchChart(
    symbol: string,
    apiId: string,
    params: { from?: string; to?: string; ticScope?: string }
  ): Promise<ChartData> {
    // 기간 매핑: ka10081 → daily, ka10082 → weekly, ka10083 → monthly, ka10080 → minute
    const periodMap: Record<string, 'daily' | 'weekly' | 'monthly' | 'minute'> = {
      ka10081: 'daily',
      ka10082: 'weekly',
      ka10083: 'monthly',
      ka10080: 'minute',
    }
    const period = periodMap[apiId] ?? 'daily'

    const allCandles: ChartCandle[] = []
    let contYn = 'Y'
    let nextKey = ''
    let pageCount = 0

    // 첫 번째 페이지 요청 시 requestWithTokenRetry로 [8005] 에러 처리 (Task 4)
    while (contYn === 'Y' && pageCount < CHART_MAX_PAGES) {
      // 요청 본문 구성 (키움 차트 API 필수: stk_cd, base_dt, upd_stkpc_tp)
      // base_dt는 조회 기준일 (이 날짜부터 과거 방향으로 데이터 반환)
      const requestBody: Record<string, string> = {
        stk_cd: symbol,
        base_dt: params.to || new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        upd_stkpc_tp: '1',
      }
      // 분봉(ka10080) 요청 시 tic_scope 파라미터 추가
      if (params.ticScope) requestBody['tic_scope'] = params.ticScope

      const currentBody = { ...requestBody }
      // 키움 차트 API는 cont-yn, next-key 헤더 필수 (첫 요청: N/'', 연속: Y/키값)
      const currentContYn = pageCount === 0 ? 'N' : 'Y'
      const currentNextKey = nextKey
      const response = await this.requestWithTokenRetry(async (token) =>
        axios.post(
          CHART_ENDPOINT,
          currentBody,
          {
            headers: {
              ...this.createHeaders(token, apiId),
              'cont-yn': currentContYn,
              'next-key': currentNextKey,
            },
            timeout: REQUEST_TIMEOUT
          }
        )
      )

      const result = response.data as KiwoomChartResponse
      // return_code가 존재하고 0이 아닌 경우 에러
      if (result.return_code !== undefined && result.return_code !== 0) {
        throw new Error(`차트 데이터 조회 실패: ${result.return_msg || '알 수 없는 에러'}`)
      }

      // 캔들 데이터 변환: API별 응답 배열 키가 다름 (stk_*_pole_chart_qry 패턴)
      // ka10081: stk_dt_pole_chart_qry, ka10082: stk_stk_pole_chart_qry, ka10083: stk_mth_pole_chart_qry
      // 동적 탐색으로 모든 TR에 대응 (분봉 등 미확인 키 포함)
      const outputList: KiwoomChartCandleItem[] = this.extractChartCandles(result)
      const candles = outputList.map(item => this.transformChartCandle(item))
      allCandles.push(...candles)

      // from 날짜 기반 페이지네이션 중단: 가장 오래된 데이터가 from 이전이면 중단
      if (params.from && candles.length > 0) {
        const oldestDate = candles[candles.length - 1].date.replace(/[-T:]/g, '').slice(0, 8)
        if (oldestDate <= params.from) break
      }

      // 페이지네이션 헤더 확인
      const responseHeaders = response.headers || {}
      contYn = responseHeaders['cont-yn'] || 'N'
      nextKey = responseHeaders['next-key'] || ''
      pageCount++
    }

    // from 날짜 이전 데이터 필터링 (캔들 날짜 >= from)
    const filteredCandles = params.from
      ? allCandles.filter(c => {
          const candleDate = c.date.replace(/[-T:]/g, '').slice(0, 8)
          return candleDate >= params.from!
        })
      : allCandles

    // 분봉(minute) 데이터: 가장 최근 거래일 데이터만 유지
    // 장외 시간(09:00 이전, 15:30 이후)이나 주말에도 직전 거래일 차트를 볼 수 있도록
    const resultCandles = period === 'minute' && filteredCandles.length > 0
      ? this.filterLatestTradingDay(filteredCandles)
      : filteredCandles

    return {
      symbol,
      period,
      candles: resultCandles
    }
  }

  /**
   * 분봉 데이터에서 가장 최근 거래일 데이터만 추출
   * 장외 시간이나 주말에도 직전 거래일 차트를 볼 수 있도록
   * 날짜 부분(YYYY-MM-DD)을 비교하여 가장 최근 날짜만 유지
   */
  private filterLatestTradingDay(candles: ChartCandle[]): ChartCandle[] {
    // 가장 최근 날짜 찾기 (캔들은 시간순 또는 역시간순일 수 있음)
    let latestDate = ''
    for (const c of candles) {
      const dateOnly = c.date.slice(0, 10) // YYYY-MM-DD 또는 YYYY-MM-DDTHH:MM:SS → YYYY-MM-DD
      if (dateOnly > latestDate) latestDate = dateOnly
    }
    // 해당 날짜의 데이터만 필터링
    return candles.filter(c => c.date.slice(0, 10) === latestDate)
  }

  /**
   * 응답에서 캔들 배열을 추출 (API별 응답 키가 다름)
   * ka10080: stk_min_pole_chart_qry, ka10081: stk_dt_pole_chart_qry
   * ka10082: stk_stk_pole_chart_qry, ka10083: stk_mth_pole_chart_qry
   * 패턴: stk_*_pole_chart_qry 키를 동적 탐색
   */
  private extractChartCandles(result: KiwoomChartResponse): KiwoomChartCandleItem[] {
    for (const key of Object.keys(result)) {
      // 주식 차트: stk_*_pole_chart_qry, 업종 차트: inds_*_pole_qry
      if ((key.endsWith('_pole_chart_qry') || key.endsWith('_pole_qry')) && Array.isArray(result[key])) {
        return result[key] as KiwoomChartCandleItem[]
      }
    }
    return []
  }

  /**
   * 차트 캔들 데이터 변환
   * @MX:NOTE: 분봉은 cntr_tm 필드 + 부호 포함 가격, 일봉/주봉/월봉은 dt 필드 + 절대값 가격
   */
  private transformChartCandle(item: KiwoomChartCandleItem): ChartCandle {
    // 날짜/시간 필드: 일봉/주봉/월봉은 dt, 분봉은 cntr_tm
    const rawDate = item.cntr_tm || item.dt || ''
    let date: string
    if (rawDate.length === 8) {
      // 일봉/주봉/월봉: YYYYMMDD → YYYY-MM-DD
      date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
    } else if (rawDate.length >= 12) {
      // 분봉: YYYYMMDDHHMMSS → YYYY-MM-DDTHH:MM:SS (ISO 형식)
      const y = rawDate.slice(0, 4)
      const mo = rawDate.slice(4, 6)
      const d = rawDate.slice(6, 8)
      const h = rawDate.slice(8, 10)
      const mi = rawDate.slice(10, 12)
      const s = rawDate.length >= 14 ? rawDate.slice(12, 14) : '00'
      date = `${y}-${mo}-${d}T${h}:${mi}:${s}`
    } else {
      date = rawDate
    }

    // 가격 파싱: 분봉은 부호 포함("-78800"), 일봉/주봉/월봉은 절대값
    // 어느 경우든 차트 OHLC는 실제 가격이므로 절대값으로 변환
    return {
      date,
      open: this.parseAbsolutePrice(item.open_pric) ?? 0,
      high: this.parseAbsolutePrice(item.high_pric) ?? 0,
      low: this.parseAbsolutePrice(item.low_pric) ?? 0,
      close: this.parseAbsolutePrice(item.cur_prc) ?? 0,
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
    const mrktTp = market === 'KOSPI' ? '0' : '10'

    // requestWithTokenRetry로 [8005] 에러 시 자동 재시도 (Task 4)
    return this.requestWithTokenRetry(async (token) => {
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
    })
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
   * 부호 포함 문자열을 부호 그대로 파싱 (REQ-004)
   * "+190" → 190, "-52500" → -52500, "-0" → 0
   * 변동폭(pred_pre), 등락률(flu_rt) 등 방향성이 있는 값에 사용
   */
  private parseSignedNumber(value: string | undefined): number | null {
    if (value === undefined || value === null || value === '') {
      return null
    }
    const cleaned = value.replace(/,/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  /**
   * 부호 포함 문자열을 절대값으로 파싱 (REQ-004)
   * "+190000" → 190000, "-52500" → 52500
   * 실제 가격(현재가, 시가, 고가, 저가 등) 파싱에 사용
   */
  private parseAbsolutePrice(value: string | undefined): number | null {
    const num = this.parseSignedNumber(value)
    return num === null ? null : Math.abs(num)
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
