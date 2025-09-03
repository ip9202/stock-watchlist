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
    PyKRX를 사용해 한국 주식 정보를 가져옵니다.
    
    Args:
        symbol (str): 종목코드 (예: '005930' for 삼성전자)
    
    Returns:
        dict: 주식 정보
    """
    try:
        # 오늘 날짜
        today = datetime.now().strftime('%Y%m%d')
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
        
        # 종목명 가져오기
        stock_name = stock.get_market_ticker_name(symbol)
        if not stock_name or stock_name == 'N/A':
            raise Exception(f"종목코드 {symbol}를 찾을 수 없습니다.")
        
        # 현재 주가 데이터 가져오기 (오늘 또는 최근 거래일)
        try:
            df = stock.get_market_ohlcv_by_date(today, today, symbol)
            if df.empty:
                # 오늘 데이터가 없으면 어제 데이터 사용
                df = stock.get_market_ohlcv_by_date(yesterday, yesterday, symbol)
        except:
            # 최근 5일 데이터에서 가장 최신 데이터 가져오기
            five_days_ago = (datetime.now() - timedelta(days=5)).strftime('%Y%m%d')
            df = stock.get_market_ohlcv_by_date(five_days_ago, today, symbol)
        
        if df.empty:
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
        
        # 시가총액 계산 (상장주식수 필요)
        try:
            # 상장주식수 가져오기 (단위: 주)
            shares_outstanding = stock.get_market_fundamental_by_ticker(today, symbol)
            if not shares_outstanding.empty and '상장주식수' in shares_outstanding.columns:
                shares = int(shares_outstanding.iloc[0]['상장주식수'])
                market_cap = current_price * shares
            else:
                market_cap = 0
        except:
            market_cap = 0
        
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
            'timestamp': datetime.now().isoformat(),
            'extra_info': {
                'data_source': 'PyKRX (한국거래소)',
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
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