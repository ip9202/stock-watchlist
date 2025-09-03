#!/usr/bin/env python3
"""
Korean Stock Data Fetcher using PyKRX API
한국 주식 데이터를 PyKRX(한국거래소)에서 가져오는 스크립트
"""

import json
import sys
import argparse
from datetime import datetime, timedelta
from pykrx import stock


def get_korean_stock_info(symbol):
    """
    PyKRX를 사용해 한국 주식/ETF 정보를 가져옵니다.
    
    Args:
        symbol (str): 종목코드 (예: '005930' for 삼성전자, '069500' for KODEX200)
    
    Returns:
        dict: 주식/ETF 정보
    """
    try:
        # 오늘 날짜
        today = datetime.now().strftime('%Y%m%d')
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
        
        # ETF 여부 확인
        is_etf = False
        stock_name = None
        
        # 먼저 일반 주식으로 시도
        try:
            stock_name = stock.get_market_ticker_name(symbol)
            if not stock_name or stock_name == 'N/A':
                raise Exception("일반 주식 아님")
        except:
            # ETF로 시도
            try:
                etf_list = stock.get_etf_ticker_list(today)
                if symbol in etf_list:
                    is_etf = True
                    # ETF 이름 가져오기 (여러 방법 시도)
                    try:
                        # 방법 1: ETF 기본 정보 가져오기
                        etf_info = stock.get_etf_portfolio_deposit_file(symbol)
                        if not etf_info.empty:
                            if '종목명' in etf_info.columns:
                                stock_name = etf_info['종목명'].iloc[0]
                            else:
                                # 컬럼명이 다를 수 있으므로 첫번째 컬럼 사용
                                stock_name = etf_info.iloc[0, 0] if len(etf_info.columns) > 0 else f"ETF_{symbol}"
                        else:
                            stock_name = f"ETF_{symbol}"
                    except:
                        # 방법 2: 캐시에서 찾기
                        try:
                            import os
                            cache_file = '/app/all_stocks_cache.json'
                            if os.path.exists(cache_file):
                                import json
                                with open(cache_file, 'r', encoding='utf-8') as f:
                                    cache_data = json.load(f)
                                    for item in cache_data.get('data', []):
                                        if item.get('symbol') == symbol:
                                            stock_name = item.get('name', f"ETF_{symbol}")
                                            break
                                    else:
                                        stock_name = f"ETF_{symbol}"
                            else:
                                stock_name = f"ETF_{symbol}"
                        except:
                            stock_name = f"ETF_{symbol}"
                else:
                    raise Exception(f"종목코드 {symbol}를 찾을 수 없습니다.")
            except Exception as e:
                raise Exception(f"종목코드 {symbol}를 찾을 수 없습니다: {str(e)}")
        
        # 주가 데이터 가져오기
        df = None
        
        if is_etf:
            # ETF 데이터 가져오기
            try:
                df = stock.get_etf_ohlcv_by_date(today, today, symbol)
                if df.empty:
                    df = stock.get_etf_ohlcv_by_date(yesterday, yesterday, symbol)
            except:
                five_days_ago = (datetime.now() - timedelta(days=5)).strftime('%Y%m%d')
                df = stock.get_etf_ohlcv_by_date(five_days_ago, today, symbol)
        else:
            # 일반 주식 데이터 가져오기
            try:
                df = stock.get_market_ohlcv_by_date(today, today, symbol)
                if df.empty:
                    df = stock.get_market_ohlcv_by_date(yesterday, yesterday, symbol)
            except:
                five_days_ago = (datetime.now() - timedelta(days=5)).strftime('%Y%m%d')
                df = stock.get_market_ohlcv_by_date(five_days_ago, today, symbol)
        
        if df is None or df.empty:
            raise Exception(f"종목 {symbol}의 주가 데이터를 찾을 수 없습니다.")
        
        # 최신 데이터 (가장 마지막 행)
        latest_data = df.iloc[-1]
        
        current_price = int(latest_data['종가'])
        open_price = int(latest_data['시가'])
        high_price = int(latest_data['고가'])
        low_price = int(latest_data['저가'])
        volume = int(latest_data['거래량'])
        
        # 전일 종가 계산 (직전 거래일)
        if len(df) > 1:
            previous_close = int(df.iloc[-2]['종가'])
        else:
            # 데이터가 1개만 있으면 시가를 전일 종가로 사용
            previous_close = open_price
        
        # 변화량 계산
        change_amount = current_price - previous_close
        change_percent = round((change_amount / previous_close * 100), 2) if previous_close else 0
        
        # 시가총액 및 52주 최고/최저 계산
        market_cap = 0
        high_52w = 0
        low_52w = 0
        
        if not is_etf:  # 일반 주식만 시가총액 계산
            try:
                # 시가총액과 상장주식수 직접 조회
                cap_data = stock.get_market_cap_by_date(today, today, symbol)
                if cap_data.empty:
                    cap_data = stock.get_market_cap_by_date(yesterday, yesterday, symbol)
                
                if not cap_data.empty:
                    # 직접 시가총액 사용 (PyKRX에서 계산된 값)
                    market_cap = int(cap_data.iloc[-1]['시가총액'])
                    shares_outstanding = int(cap_data.iloc[-1]['상장주식수'])
                    print(f"시가총액: {market_cap:,}원, 상장주식수: {shares_outstanding:,}주", file=sys.stderr)
            except Exception as e:
                print(f"시가총액 계산 실패: {e}", file=sys.stderr)
                market_cap = 0
        else:  # ETF의 경우
            try:
                # ETF NAV (Net Asset Value) 정보 가져오기
                etf_info = stock.get_etf_portfolio_deposit_file(symbol)
                if not etf_info.empty and 'NAV' in etf_info.columns:
                    # NAV 값이 있는 경우 (단위: 원)
                    nav_value = etf_info['NAV'].iloc[0]
                    market_cap = int(float(nav_value)) if nav_value else 0
                    print(f"ETF NAV: {market_cap:,}원", file=sys.stderr)
                else:
                    # NAV 정보가 없는 경우, 0으로 설정 (ETF는 시가총액 개념이 없음)
                    market_cap = 0
                    print(f"ETF {symbol}: 시가총액 정보 없음 (ETF는 NAV로 평가)", file=sys.stderr)
            except Exception as e:
                print(f"ETF NAV 조회 실패: {e}, 시가총액을 0으로 설정", file=sys.stderr)
                market_cap = 0
        
        # 52주 최고/최저 계산 (1년치 데이터)
        try:
            one_year_ago = (datetime.now() - timedelta(days=365)).strftime('%Y%m%d')
            
            if is_etf:
                yearly_df = stock.get_etf_ohlcv_by_date(one_year_ago, today, symbol)
            else:
                yearly_df = stock.get_market_ohlcv_by_date(one_year_ago, today, symbol)
            
            if not yearly_df.empty:
                high_52w = int(yearly_df['고가'].max())
                low_52w = int(yearly_df['저가'].min())
        except Exception as e:
            print(f"52주 최고/최저 계산 실패: {e}", file=sys.stderr)
            high_52w = 0
            low_52w = 0
        
        # 결과 반환
        return {
            'success': True,
            'symbol': symbol,
            'name': stock_name,
            'price': current_price,
            'changeAmount': change_amount,
            'changePercent': change_percent,
            'volume': volume,
            'marketCap': market_cap,
            'high': high_price,
            'low': low_price,
            'open': open_price,
            'previousClose': previous_close,
            'high52w': high_52w,
            'low52w': low_52w,
            'timestamp': datetime.now().isoformat(),
            'extra_info': {
                'data_source': 'PyKRX (한국거래소)',
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'is_etf': is_etf
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'PyKRX 데이터 조회 실패: {str(e)}',
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
    parser = argparse.ArgumentParser(description='Fetch Korean stock data from PyKRX')
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