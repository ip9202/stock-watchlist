#!/usr/bin/env python3
"""
키움증권 OpenAPI REST API
PyKRX 대신 키움 REST API로 전체 종목 조회 및 검색
"""

import requests
import json
import sys
import os
import asyncio
import argparse
from datetime import datetime
from typing import List, Dict, Optional


# 키움 REST API 설정
REST_API_URL = "https://api.kiwoom.com/api/dostk/caf07010"  # 주식 기본 정보 조회
# 모의투자: https://mockapi.kiwoom.com/api/dostk/caf07010


async def get_access_token(appkey: str, secretkey: str) -> str:
    """
    접근토큰 발급
    """
    url = "https://api.kiwoom.com/oauth2/token"
    headers = {'Content-Type': 'application/json;charset=UTF-8'}
    data = {
        'grant_type': 'client_credentials',
        'appkey': appkey,
        'secretkey': secretkey,
    }

    response = requests.post(url, headers=headers, json=data, timeout=10)
    result = response.json()

    if result.get('return_code') == 0:
        return result.get('token')
    else:
        raise Exception(f"토큰 발급 실패: {result.get('return_msg')}")


def fetch_stock_info_rest(appkey: str, secretkey: str, market: str = "ALL") -> List[Dict]:
    """
    키움 REST API로 전체 종목 정보 조회

    Args:
        appkey: 키움 앱 키
        secretkey: 키움 시크릿 키
        market: 시장 구분 (ALL/KOSPI/KOSDAQ)

    Returns:
        종목 정보 리스트
    """
    # 토큰 발급
    try:
        token = asyncio.run(get_access_token(appkey, secretkey))
        print(f"토큰 발급 완료", file=sys.stderr)
    except Exception as e:
        print(f"토큰 발급 실패: {e}", file=sys.stderr)
        return []

    # REST API 요청 헤더
    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'Authorization': f'Bearer {token}',
        'appkey': appkey,
        'appsecret': secretkey,
    }

    # 전체 종목 조회 요청
    # 주식 기본 정보 조회 TR (CAF07010)
    all_stocks = []

    try:
        # KOSPI 종목 조회
        if market in ["ALL", "KOSPI"]:
            print("KOSPI 종목 조회 중...", file=sys.stderr)
            kospi_stocks = fetch_market_stocks(headers, "KOSPI")
            all_stocks.extend(kospi_stocks)
            print(f"KOSPI: {len(kospi_stocks)}개 종목", file=sys.stderr)

        # KOSDAQ 종목 조회
        if market in ["ALL", "KOSDAQ"]:
            print("KOSDAQ 종목 조회 중...", file=sys.stderr)
            kosdaq_stocks = fetch_market_stocks(headers, "KOSDAQ")
            all_stocks.extend(kosdaq_stocks)
            print(f"KOSDAQ: {len(kosdaq_stocks)}개 종목", file=sys.stderr)

        return all_stocks

    except Exception as e:
        print(f"종목 조회 실패: {e}", file=sys.stderr)
        return []


def fetch_market_stocks(headers: Dict, market: str) -> List[Dict]:
    """
    특정 시장 종목 조회
    """
    stocks = []

    # 키움 API 요청 파라미터
    params = {
        'tr_id': 'CAF07010',  # 주식 기본 정보 조회
        'tr_cont': '',        # 연속 여부
        'market_code': '1' if market == 'KOSPI' else '2',  # 1:KOSPI, 2:KOSDAQ
    }

    response = requests.get(
        REST_API_URL,
        headers=headers,
        params=params,
        timeout=30
    )

    result = response.json()

    if result.get('return_code') == 0:
        # 응답 데이터 파싱
        output = result.get('output', [])
        for item in output:
            stocks.append({
                'symbol': item.get('hname', ''),  # 종목코드
                'name': item.get('name', ''),      # 종목명
                'market': market,
                'search_keywords': [
                    item.get('hname', ''),
                    item.get('name', ''),
                    market.lower()
                ]
            })
    else:
        print(f"{market} 조회 실패: {result.get('return_msg')}", file=sys.stderr)

    return stocks


def search_stocks(query: str, stocks_data: List[Dict], limit: int = 20) -> List[Dict]:
    """
    종목 검색 (기존 로직 유지)
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


def read_api_keys():
    """
    API 키 읽기
    """
    appkey = os.getenv('KIWOOM_APP_KEY')
    secretkey = os.getenv('KIWOOM_SECRET_KEY')

    if not appkey or not secretkey:
        try:
            key_dir = '/app/scripts/keys'
            if not os.path.exists(key_dir):
                key_dir = os.path.join(os.path.dirname(__file__), 'keys')

            with open(os.path.join(key_dir, 'appkey.txt'), 'r') as f:
                appkey = f.read().strip()
            with open(os.path.join(key_dir, 'secretkey.txt'), 'r') as f:
                secretkey = f.read().strip()
        except Exception as e:
            raise Exception(f"API 키를 찾을 수 없습니다: {str(e)}")

    return appkey, secretkey


def main():
    parser = argparse.ArgumentParser(description='키움 REST API 주식 검색')
    parser.add_argument('--search', '-s', type=str, help='Search query')
    parser.add_argument('--search-file', type=str, help='File containing search query (UTF-8)')
    parser.add_argument('--limit', '-l', type=int, default=20, help='Search result limit')
    parser.add_argument('--cache', '-c', type=str, help='Cache file path for stock data')
    parser.add_argument('--refresh', '-r', action='store_true', help='Force refresh stock data')
    parser.add_argument('--market', '-m', type=str, default='ALL', choices=['ALL', 'KOSPI', 'KOSDAQ'],
                        help='Market to query (default: ALL)')

    args = parser.parse_args()

    try:
        # API 키 읽기
        appkey, secretkey = read_api_keys()

        # 캐시 설정
        cache_file = args.cache or '/app/all_stocks_kiwoom_rest_cache.json'
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
            stocks_data = fetch_stock_info_rest(appkey, secretkey, args.market)

            # 캐시 저장
            if stocks_data:
                try:
                    cache_data = {
                        'success': True,
                        'timestamp': datetime.now().isoformat(),
                        'total_count': len(stocks_data),
                        'data': stocks_data,
                        'source': 'kiwoom_rest_api'
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
                'timestamp': datetime.now().isoformat(),
                'source': 'kiwoom_rest_api'
            }
        else:
            output = {
                'success': True,
                'total_count': len(stocks_data),
                'data': stocks_data[:args.limit] if args.limit else stocks_data,
                'timestamp': datetime.now().isoformat(),
                'source': 'kiwoom_rest_api'
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
