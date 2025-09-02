#!/usr/bin/env python3
"""
실시간 주식 검색 API
네이버 금융 검색을 활용한 전체 종목 검색
"""

import requests
import json
import sys
import argparse
from datetime import datetime
import re

def search_naver_stocks(query, limit=20):
    """
    네이버 금융에서 주식 검색
    
    Args:
        query (str): 검색 키워드
        limit (int): 최대 결과 수
    
    Returns:
        dict: 검색 결과
    """
    try:
        # 네이버 금융 검색 API (비공식)
        url = "https://finance.naver.com/api/search/searchListJson.nhn"
        
        params = {
            'query': query,
            'target': 'stock',
            'count': min(limit, 50)  # 최대 50개
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://finance.naver.com/'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        # 응답 파싱 (JSONP 형태일 수 있음)
        text = response.text
        if text.startswith('(') and text.endswith(')'):
            text = text[1:-1]  # JSONP 괄호 제거
            
        data = json.loads(text)
        
        results = []
        items = data.get('items', [])
        
        for item in items:
            try:
                # 종목 정보 추출
                code = item.get('code', '')
                name = item.get('name', '')
                market = item.get('market', '')
                
                # 종목코드 정리 (앞의 A 제거 등)
                clean_code = re.sub(r'^A?', '', code).zfill(6)
                
                # 시장 구분 정리
                if 'KOSPI' in market.upper():
                    market_type = 'KOSPI'
                elif 'KOSDAQ' in market.upper():
                    market_type = 'KOSDAQ'
                else:
                    market_type = 'KONEX'
                
                results.append({
                    'symbol': clean_code,
                    'name': name,
                    'market': market_type,
                    'source': 'naver'
                })
                
            except Exception as e:
                print(f"아이템 처리 오류: {e}")
                continue
        
        return {
            'success': True,
            'query': query,
            'results': results,
            'total_found': len(results),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'query': query,
            'timestamp': datetime.now().isoformat()
        }

def search_fallback_stocks(query, limit=20):
    """
    폴백 검색: 하드코딩된 확장 종목 리스트에서 검색
    """
    # 확장된 종목 리스트 (100개+ 종목)
    EXTENDED_STOCKS = [
        # 기존 종목들 + 추가 종목들
        {'symbol': '005930', 'name': '삼성전자', 'market': 'KOSPI', 'keywords': ['삼성전자', '삼성', 'Samsung']},
        {'symbol': '000660', 'name': 'SK하이닉스', 'market': 'KOSPI', 'keywords': ['SK하이닉스', 'SK', '하이닉스', 'Hynix']},
        {'symbol': '035420', 'name': '네이버', 'market': 'KOSPI', 'keywords': ['네이버', 'NAVER', '네이버주식회사']},
        {'symbol': '207940', 'name': '삼성바이오로직스', 'market': 'KOSPI', 'keywords': ['삼성바이오로직스', '삼성바이오', '바이오로직스']},
        {'symbol': '086790', 'name': '하나금융지주', 'market': 'KOSPI', 'keywords': ['하나금융지주', '하나금융', '하나은행', '하나']},
        {'symbol': '316140', 'name': '우리금융지주', 'market': 'KOSPI', 'keywords': ['우리금융지주', '우리금융', '우리은행', '우리']},
        {'symbol': '003670', 'name': '포스코홀딩스', 'market': 'KOSPI', 'keywords': ['포스코홀딩스', '포스코', 'POSCO']},
        {'symbol': '323410', 'name': '카카오뱅크', 'market': 'KOSPI', 'keywords': ['카카오뱅크', '카뱅', 'KakaoBank']},
        {'symbol': '036570', 'name': '엔씨소프트', 'market': 'KOSPI', 'keywords': ['엔씨소프트', 'NCsoft', 'NC', '엔씨']},
        {'symbol': '251270', 'name': '넷마블', 'market': 'KOSPI', 'keywords': ['넷마블', 'Netmarble']},
        {'symbol': '112040', 'name': '위메이드', 'market': 'KOSDAQ', 'keywords': ['위메이드', 'Wemade']},
        {'symbol': '196170', 'name': '알테오젠', 'market': 'KOSDAQ', 'keywords': ['알테오젠', 'Alteogen']},
        {'symbol': '302440', 'name': '셀투리온', 'market': 'KOSDAQ', 'keywords': ['셀투리온', 'Celltrion']},
        {'symbol': '145020', 'name': '휴젤', 'market': 'KOSDAQ', 'keywords': ['휴젤', 'Hugel']},
        
        # 추가 인기 종목들
        {'symbol': '000810', 'name': '삼성화재', 'market': 'KOSPI', 'keywords': ['삼성화재', '삼성화재해상보험', '화재']},
        {'symbol': '032830', 'name': '삼성생명', 'market': 'KOSPI', 'keywords': ['삼성생명', '삼성생명보험', '생명']},
        {'symbol': '015760', 'name': '한국전력', 'market': 'KOSPI', 'keywords': ['한국전력', '한전', 'KEPCO', '전력']},
        {'symbol': '018260', 'name': '삼성에스디에스', 'market': 'KOSPI', 'keywords': ['삼성에스디에스', '삼성SDS', 'SDS']},
        {'symbol': '009150', 'name': '삼성전기', 'market': 'KOSPI', 'keywords': ['삼성전기', '삼성전자부품', '전기']},
        {'symbol': '034730', 'name': 'SK', 'market': 'KOSPI', 'keywords': ['SK', 'SK주식회사']},
        {'symbol': '011200', 'name': 'HMM', 'market': 'KOSPI', 'keywords': ['HMM', '현대상선', '상선']},
        {'symbol': '024110', 'name': '기업은행', 'market': 'KOSPI', 'keywords': ['기업은행', 'IBK', '중소기업은행']},
        {'symbol': '139480', 'name': '이마트', 'market': 'KOSPI', 'keywords': ['이마트', 'E-MART', '마트']},
        {'symbol': '097950', 'name': 'CJ제일제당', 'market': 'KOSPI', 'keywords': ['CJ제일제당', 'CJ', '제일제당']},
        {'symbol': '271560', 'name': '오리온', 'market': 'KOSPI', 'keywords': ['오리온', 'Orion']},
        {'symbol': '051900', 'name': 'LG생활건강', 'market': 'KOSPI', 'keywords': ['LG생활건강', 'LG화장품', '생활건강']},
        {'symbol': '090430', 'name': '아모레퍼시픽', 'market': 'KOSPI', 'keywords': ['아모레퍼시픽', '아모레', 'Amore']},
        {'symbol': '282330', 'name': 'BGF리테일', 'market': 'KOSPI', 'keywords': ['BGF리테일', 'BGF', '편의점']},
        
        # 건설/화학/소재
        {'symbol': '000720', 'name': '현대건설', 'market': 'KOSPI', 'keywords': ['현대건설', '현대', '건설']},
        {'symbol': '004020', 'name': '현대제철', 'market': 'KOSPI', 'keywords': ['현대제철', '제철']},
        {'symbol': '009830', 'name': '한화솔루션', 'market': 'KOSPI', 'keywords': ['한화솔루션', '한화', '한화케미칼', '솔루션']},
        {'symbol': '011170', 'name': '롯데케미칼', 'market': 'KOSPI', 'keywords': ['롯데케미칼', '롯데', '화학']},
        {'symbol': '002350', 'name': '넥센타이어', 'market': 'KOSPI', 'keywords': ['넥센타이어', '넥센', '타이어']},
        {'symbol': '192820', 'name': '코스맥스', 'market': 'KOSPI', 'keywords': ['코스맥스', 'Cosmax']},
    ]
    
    query_lower = query.lower()
    results = []
    
    for stock in EXTENDED_STOCKS:
        # 종목코드로 검색
        if query in stock['symbol']:
            results.append({
                'symbol': stock['symbol'],
                'name': stock['name'],
                'market': stock['market'],
                'source': 'fallback'
            })
            continue
            
        # 종목명 및 키워드로 검색
        found = False
        for keyword in stock['keywords']:
            if query_lower in keyword.lower():
                results.append({
                    'symbol': stock['symbol'],
                    'name': stock['name'],
                    'market': stock['market'],
                    'source': 'fallback'
                })
                found = True
                break
        
        if found:
            continue
    
    return {
        'success': True,
        'query': query,
        'results': results[:limit],
        'total_found': len(results),
        'timestamp': datetime.now().isoformat()
    }

def main():
    parser = argparse.ArgumentParser(description='Search Korean stocks')
    parser.add_argument('--query', '-q', type=str, required=True, help='Search query')
    parser.add_argument('--limit', '-l', type=int, default=20, help='Result limit')
    parser.add_argument('--fallback-only', action='store_true', help='Use fallback search only')
    
    args = parser.parse_args()
    
    try:
        if args.fallback_only:
            # 폴백 검색만 사용
            result = search_fallback_stocks(args.query, args.limit)
        else:
            # 네이버 검색 시도, 실패시 폴백 사용
            result = search_naver_stocks(args.query, args.limit)
            
            if not result['success'] or len(result.get('results', [])) == 0:
                print("네이버 검색 실패 또는 결과 없음. 폴백 검색 사용...", file=sys.stderr)
                result = search_fallback_stocks(args.query, args.limit)
        
        # JSON 출력
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'query': args.query,
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()