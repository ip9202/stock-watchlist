#!/usr/bin/env python3
"""
한국 주식 검색 시스템
전체 종목 조회는 PyKRX 사용 (안정적)
개별 종목 조회는 Kiwoom WebSocket 사용
"""

import json
import sys
import os
import argparse
from datetime import datetime


def get_all_stocks_pykrx():
    """
    PyKRX로 전체 종목 조회
    """
    try:
        from pykrx import stock

        print("PyKRX에서 전체 종목 조회 중...", file=sys.stderr)

        stocks = []

        # KOSPI 종목
        kospi = stock.get_market_ticker_list("KOSPI")
        for ticker in kospi:
            name = stock.get_market_ticker_name(ticker)
            stocks.append({
                'symbol': ticker,
                'name': name,
                'market': 'KOSPI',
                'search_keywords': [ticker, name, 'kospi']
            })

        # KOSDAQ 종목
        kosdaq = stock.get_market_ticker_list("KOSDAQ")
        for ticker in kosdaq:
            name = stock.get_market_ticker_name(ticker)
            stocks.append({
                'symbol': ticker,
                'name': name,
                'market': 'KOSDAQ',
                'search_keywords': [ticker, name, 'kosdaq']
            })

        print(f"PyKRX에서 {len(stocks)}개 종목 로드 완료", file=sys.stderr)
        return stocks

    except ImportError:
        print("PyKRX가 설치되지 않음", file=sys.stderr)
        return []
    except Exception as e:
        print(f"PyKRX 데이터 로드 실패: {str(e)}", file=sys.stderr)
        return []


def search_stocks(query, stocks_data, limit=20):
    """
    종목 검색
    """
    if not query or not stocks_data:
        return []

    query = query.lower().strip()
    normalized_query = query.replace(' ', '')
    results = []

    for stock_info in stocks_data:
        score = 0

        # Symbol Match
        if query == stock_info['symbol']:
            score = 100
        elif query in stock_info['symbol']:
            score = max(score, 90)

        # Name Match
        normalized_name = stock_info['name'].lower().replace(' ', '')
        if normalized_query == normalized_name:
            score = max(score, 85)
        elif normalized_name.startswith(normalized_query):
            score = max(score, 80)
        elif normalized_query in normalized_name:
            score = max(score, 70)

        # Keyword Match
        for keyword in stock_info.get('search_keywords', []):
            normalized_keyword = keyword.lower().replace(' ', '')
            if normalized_query == normalized_keyword:
                score = max(score, 75)
                break
            elif normalized_query in normalized_keyword:
                score = max(score, 65)

        if score > 0:
            results.append({
                'symbol': stock_info['symbol'],
                'name': stock_info['name'],
                'market': stock_info['market'],
                'score': score
            })

    # 정렬 및 중복 제거
    results.sort(key=lambda x: x['score'], reverse=True)

    unique_results = []
    seen_symbols = set()
    for result in results:
        if result['symbol'] not in seen_symbols:
            unique_results.append(result)
            seen_symbols.add(result['symbol'])

    for result in unique_results:
        del result['score']

    return unique_results[:limit]


def main():
    parser = argparse.ArgumentParser(description='Korean stock search (PyKRX)')
    parser.add_argument('--search', '-s', type=str, help='Search query')
    parser.add_argument('--search-file', type=str, help='File containing search query (UTF-8)')
    parser.add_argument('--limit', '-l', type=int, default=20, help='Search result limit')
    parser.add_argument('--cache', '-c', type=str, help='Cache file path for stock data')
    parser.add_argument('--refresh', '-r', action='store_true', help='Force refresh stock data')

    args = parser.parse_args()

    try:
        # 캐시 설정
        cache_file = args.cache or '/app/all_stocks_kiwoom_cache.json'
        stocks_data = None

        # 캐시 로드 시도
        if not args.refresh:
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                    cache_date = cached_data.get('timestamp', '')
                    if cache_date:
                        cache_time = datetime.fromisoformat(cache_date.replace('Z', '+00:00') if 'Z' in cache_date else cache_date)
                        if (datetime.now() - cache_time).days <= 7:
                            stocks_data = cached_data['data']
                            print(f"캐시에서 {len(stocks_data)}개 종목 로드", file=sys.stderr)
            except Exception as e:
                print(f"캐시 로드 실패: {e}", file=sys.stderr)

        # 캐시가 없거나 새로고침인 경우
        if stocks_data is None:
            stocks_data = get_all_stocks_pykrx()

            # 캐시 저장
            if stocks_data:
                try:
                    cache_data = {
                        'success': True,
                        'timestamp': datetime.now().isoformat(),
                        'total_count': len(stocks_data),
                        'data': stocks_data
                    }
                    with open(cache_file, 'w', encoding='utf-8') as f:
                        json.dump(cache_data, f, ensure_ascii=False, indent=2)
                    print(f"캐시 저장 완료: {len(stocks_data)}개 종목", file=sys.stderr)
                except Exception as e:
                    print(f"캐시 저장 실패: {e}", file=sys.stderr)

        # 검색 쿼리 결정
        search_query = None

        if os.getenv('SEARCH_QUERY'):
            search_query = os.getenv('SEARCH_QUERY')
        elif args.search_file:
            try:
                with open(args.search_file, 'r', encoding='utf-8') as f:
                    search_query = f.read().strip()
                os.remove(args.search_file)
            except Exception as e:
                print(f"검색 파일 읽기 실패: {e}", file=sys.stderr)
        elif args.search:
            search_query = args.search

        # 검색 수행 또는 전체 데이터 반환
        if search_query:
            search_results = search_stocks(search_query, stocks_data, args.limit)
            output = {
                'success': True,
                'query': search_query,
                'results': search_results,
                'total_found': len(search_results),
                'timestamp': datetime.now().isoformat()
            }
        else:
            output = {
                'success': True,
                'total_count': len(stocks_data),
                'data': stocks_data[:args.limit] if args.limit else stocks_data,
                'timestamp': datetime.now().isoformat()
            }

        print(json.dumps(output, ensure_ascii=False, indent=2))

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
