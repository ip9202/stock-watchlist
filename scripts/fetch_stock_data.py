#!/usr/bin/env python3
"""
Korean Stock Data Fetcher using Yahoo Finance API
한국 주식 데이터를 Yahoo Finance에서 가져오는 스크립트
"""

import yfinance as yf
import json
import sys
import argparse
from datetime import datetime, timedelta
# korean_stock_names 의존성 제거 - PyKRX에서 직접 한국어명 가져옴
try:
    from pykrx import stock as pykrx_stock
    PYKRX_AVAILABLE = True
except ImportError:
    PYKRX_AVAILABLE = False


def get_korean_stock_info(symbol):
    """
    한국 주식 정보를 가져옵니다.
    
    Args:
        symbol (str): 종목코드 (예: '005930' for 삼성전자)
    
    Returns:
        dict: 주식 정보
    """
    try:
        # 한국 주식은 .KS 접미사 필요
        yahoo_symbol = f"{symbol}.KS"
        
        # yfinance Ticker 객체 생성
        ticker = yf.Ticker(yahoo_symbol)
        
        # 기본 정보 가져오기
        info = ticker.info
        
        # 최근 1일 데이터 가져오기 (실시간에 가까운 데이터)
        hist = ticker.history(period="1d", interval="1m")
        
        if hist.empty:
            # 1분 데이터가 없으면 일봉 데이터 시도
            hist = ticker.history(period="5d", interval="1d")
        
        if hist.empty:
            raise Exception("No historical data found")
        
        # 최신 데이터
        latest = hist.iloc[-1]
        previous_close = info.get('previousClose', latest['Open'])
        current_price = latest['Close']
        
        # 변화량 계산
        change_amount = current_price - previous_close
        change_percent = (change_amount / previous_close * 100) if previous_close else 0
        
        # 한국어 종목명 가져오기 (우선순위: PyKRX > 한국어 매핑 > Yahoo Finance 정보)
        display_name = None
        
        # 1순위: PyKRX에서 한국어 이름 가져오기
        if PYKRX_AVAILABLE:
            try:
                pykrx_name = pykrx_stock.get_market_ticker_name(symbol)
                if pykrx_name and pykrx_name != 'N/A':
                    display_name = pykrx_name
            except:
                pass
        
        # 2순위는 제거됨 - PyKRX에서 충분히 정확한 한국어명 제공
        
        # 2순위: Yahoo Finance 정보
        if not display_name:
            display_name = info.get('longName') or info.get('shortName', 'N/A')
        
        # 거래량 데이터 수집 (네이버 실시간 API 우선, PyKRX 보조)
        volume = 0
        volume_source = "Yahoo Finance"
        
        # 1순위: 네이버 실시간 API
        try:
            import requests
            naver_url = f'https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:{symbol}'
            naver_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            
            naver_response = requests.get(naver_url, headers=naver_headers, timeout=5)
            if naver_response.status_code == 200:
                naver_data = naver_response.json()
                if naver_data.get('resultCode') == 'success':
                    areas = naver_data.get('result', {}).get('areas', [])
                    if areas and len(areas) > 0:
                        datas = areas[0].get('datas', [])
                        if datas and len(datas) > 0:
                            stock_data = datas[0]
                            naver_volume = stock_data.get('aq', 0)  # 거래량
                            if naver_volume and naver_volume > 0:
                                volume = int(naver_volume)
                                volume_source = "네이버 실시간"
        except Exception as e:
            print(f"네이버 실시간 거래량 수집 실패: {e}")
        
        # 2순위: PyKRX 데이터
        if volume == 0 and PYKRX_AVAILABLE:
            try:
                from datetime import date
                today = date.today().strftime("%Y%m%d")
                pykrx_df = pykrx_stock.get_market_ohlcv_by_date(today, today, symbol)
                if not pykrx_df.empty and '거래량' in pykrx_df.columns:
                    volume = int(pykrx_df['거래량'].iloc[-1])
                    volume_source = "PyKRX"
            except Exception as e:
                print(f"PyKRX 거래량 수집 실패: {e}")
        
        # 3순위: Yahoo Finance 데이터
        if volume == 0 and 'Volume' in latest:
            try:
                volume = int(latest['Volume'])
                volume_source = "Yahoo Finance"
            except:
                volume = 0
        
        # 결과 구성
        result = {
            'success': True,
            'symbol': symbol,
            'yahoo_symbol': yahoo_symbol,
            'name': display_name,
            'price': float(current_price),
            'changeAmount': float(change_amount),
            'changePercent': round(float(change_percent), 2),
            'volume': volume,
            'high': float(latest['High']) if 'High' in latest else None,
            'low': float(latest['Low']) if 'Low' in latest else None,
            'open': float(latest['Open']) if 'Open' in latest else None,
            'previousClose': float(previous_close),
            'marketCap': info.get('marketCap'),
            'timestamp': datetime.now().isoformat(),
            
            # 추가 정보
            'extra_info': {
                'currency': info.get('currency', 'KRW'),
                'exchange': info.get('exchange', 'KRX'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'fiftyTwoWeekHigh': info.get('fiftyTwoWeekHigh'),
                'fiftyTwoWeekLow': info.get('fiftyTwoWeekLow'),
                'sharesOutstanding': info.get('sharesOutstanding'),
                'volume_source': volume_source
            }
        }
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }


def get_multiple_stocks(symbols):
    """
    여러 종목의 데이터를 한번에 가져옵니다.
    
    Args:
        symbols (list): 종목코드 리스트
    
    Returns:
        dict: 전체 결과
    """
    results = {}
    
    for symbol in symbols:
        results[symbol] = get_korean_stock_info(symbol)
    
    return {
        'success': True,
        'timestamp': datetime.now().isoformat(),
        'data': results
    }


def main():
    parser = argparse.ArgumentParser(description='Fetch Korean stock data from Yahoo Finance')
    parser.add_argument('--symbol', '-s', type=str, help='Single stock symbol (e.g., 005930)')
    parser.add_argument('--symbols', '-m', type=str, nargs='+', help='Multiple stock symbols')
    parser.add_argument('--output', '-o', type=str, help='Output file path (optional)')
    
    args = parser.parse_args()
    
    if args.symbol:
        # 단일 종목
        result = get_korean_stock_info(args.symbol)
    elif args.symbols:
        # 다중 종목
        result = get_multiple_stocks(args.symbols)
    else:
        # 기본: 주요 종목들
        major_symbols = ['005930', '000660', '035420', '005935', '207940']
        result = get_multiple_stocks(major_symbols)
    
    # JSON 출력
    json_result = json.dumps(result, ensure_ascii=False, indent=2)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(json_result)
        print(f"Results saved to {args.output}")
    else:
        print(json_result)


if __name__ == "__main__":
    main()