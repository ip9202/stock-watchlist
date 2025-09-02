#!/usr/bin/env python3
"""
한국거래소(KRX) 전체 상장종목 데이터 수집
모든 KOSPI, KOSDAQ, KONEX 종목 정보를 가져옵니다.
"""

import requests
import json
import sys
import argparse
from datetime import datetime
import pandas as pd
from io import StringIO

def fetch_krx_stock_list():
    """
    한국거래소에서 전체 상장종목 리스트를 가져옵니다.
    
    Returns:
        dict: 전체 종목 정보
    """
    try:
        # KRX 상장법인목록 다운로드 URL
        url = "https://kind.krx.co.kr/corpgeneral/corpList.do"
        
        # 모든 시장의 데이터를 가져오기 위한 파라미터
        params = {
            'method': 'download',
            'searchType': '13',  # 전체
            'marketType': '',    # 전체 시장
            'orderMode': '3',    # 종목코드순
            'orderStat': 'D',    # 내림차순
        }
        
        # 한국거래소 사이트에서 데이터 다운로드
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print("한국거래소에서 상장종목 리스트를 다운로드 중...")
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        
        # EUC-KR 인코딩으로 디코딩
        content = response.content.decode('euc-kr')
        
        # CSV 데이터를 DataFrame으로 변환 (에러 무시하고 파싱)
        df = pd.read_csv(StringIO(content), encoding='utf-8', on_bad_lines='skip')
        
        # 필요한 컬럼만 선택 및 정리
        stocks = []
        for _, row in df.iterrows():
            try:
                stock_code = str(row['종목코드']).zfill(6)  # 6자리로 패딩
                company_name = str(row['회사명']).strip()
                
                # 종목명에서 불필요한 부분 제거
                clean_name = company_name
                if '(' in clean_name:
                    clean_name = clean_name.split('(')[0].strip()
                
                # 시장 구분 (업종 정보에서 추출)
                sector = str(row.get('업종', '')).strip()
                
                # 기본 시장 구분 (종목코드 기반)
                if stock_code.startswith(('00', '01', '02', '03', '04', '05')):
                    market = 'KOSPI'
                elif stock_code.startswith(('06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29')):
                    market = 'KOSPI'
                else:
                    market = 'KOSDAQ'
                
                # 검색용 키워드 생성
                search_names = [clean_name]
                
                # 회사명에서 자주 사용되는 키워드 추출
                keywords = []
                if '삼성' in clean_name:
                    keywords.extend(['삼성', 'Samsung'])
                if 'LG' in clean_name:
                    keywords.extend(['LG', 'Lucky'])
                if 'SK' in clean_name:
                    keywords.extend(['SK'])
                if '현대' in clean_name:
                    keywords.extend(['현대', 'Hyundai'])
                if '카카오' in clean_name:
                    keywords.extend(['카카오', 'Kakao'])
                if '네이버' in clean_name:
                    keywords.extend(['네이버', 'NAVER'])
                if '포스코' in clean_name:
                    keywords.extend(['포스코', 'POSCO'])
                
                search_names.extend(keywords)
                
                stock_info = {
                    'symbol': stock_code,
                    'name': clean_name,
                    'full_name': company_name,
                    'market': market,
                    'sector': sector,
                    'search_names': list(set(search_names))  # 중복 제거
                }
                
                stocks.append(stock_info)
                
            except Exception as e:
                print(f"종목 처리 중 오류 (row {len(stocks)}): {e}")
                continue
        
        result = {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'total_count': len(stocks),
            'data': stocks
        }
        
        print(f"✅ 총 {len(stocks)}개 종목 수집 완료")
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

def search_stocks(stocks_data, query, limit=20):
    """
    종목 데이터에서 검색
    
    Args:
        stocks_data (list): 전체 종목 데이터
        query (str): 검색 키워드
        limit (int): 최대 결과 수
    
    Returns:
        list: 검색 결과
    """
    if not query or not stocks_data:
        return []
    
    query = query.lower().strip()
    results = []
    
    for stock in stocks_data:
        # 종목코드로 검색
        if query in stock['symbol']:
            results.append({
                'symbol': stock['symbol'],
                'name': stock['name'],
                'market': stock['market'],
                'match_type': 'symbol'
            })
            continue
            
        # 종목명으로 검색
        if query in stock['name'].lower():
            results.append({
                'symbol': stock['symbol'],
                'name': stock['name'],
                'market': stock['market'],
                'match_type': 'name'
            })
            continue
            
        # 검색 키워드로 검색
        for search_name in stock['search_names']:
            if query in search_name.lower():
                results.append({
                    'symbol': stock['symbol'],
                    'name': stock['name'],
                    'market': stock['market'],
                    'match_type': 'keyword'
                })
                break
    
    return results[:limit]

def main():
    parser = argparse.ArgumentParser(description='Fetch all KRX stock listings')
    parser.add_argument('--output', '-o', type=str, help='Output JSON file path')
    parser.add_argument('--search', '-s', type=str, help='Search query')
    parser.add_argument('--limit', '-l', type=int, default=20, help='Search result limit')
    
    args = parser.parse_args()
    
    try:
        # 전체 종목 데이터 가져오기
        result = fetch_krx_stock_list()
        
        if not result['success']:
            print(f"오류: {result['error']}")
            sys.exit(1)
        
        # 검색 기능
        if args.search:
            search_results = search_stocks(result['data'], args.search, args.limit)
            output = {
                'success': True,
                'query': args.search,
                'results': search_results,
                'total_found': len(search_results)
            }
        else:
            output = result
        
        # JSON 출력
        json_result = json.dumps(output, ensure_ascii=False, indent=2)
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(json_result)
            print(f"결과가 {args.output}에 저장되었습니다.")
        else:
            print(json_result)
            
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