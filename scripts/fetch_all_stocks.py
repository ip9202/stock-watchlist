#!/usr/bin/env python3
"""
PyKRX를 활용한 완전한 한국 주식 검색 시스템
모든 KOSPI, KOSDAQ 종목 (2,700개+) 지원
"""

from pykrx import stock
import json
import sys
import argparse
from datetime import datetime, timedelta
import re

def get_all_korean_stocks():
    """
    전체 한국 상장 종목을 가져옵니다.
    
    Returns:
        dict: 전체 종목 정보
    """
    try:
        print("PyKRX를 통해 전체 종목 정보를 가져오는 중...", file=sys.stderr)
        
        # 오늘 날짜로 종목 리스트 가져오기
        today = datetime.now().strftime('%Y%m%d')
        
        # KOSPI 종목
        kospi_tickers = stock.get_market_ticker_list(today, market='KOSPI')
        print(f"KOSPI 종목: {len(kospi_tickers)}개", file=sys.stderr)
        
        # KOSDAQ 종목
        kosdaq_tickers = stock.get_market_ticker_list(today, market='KOSDAQ')
        print(f"KOSDAQ 종목: {len(kosdaq_tickers)}개", file=sys.stderr)
        
        # KONEX 종목
        konex_tickers = []
        try:
            konex_tickers = stock.get_market_ticker_list(today, market='KONEX')
            print(f"KONEX 종목: {len(konex_tickers)}개", file=sys.stderr)
        except:
            pass
        
        # ETF 전체 (1,020개)
        etf_tickers = []
        try:
            etf_tickers = stock.get_etf_ticker_list(today)
            print(f"ETF 종목: {len(etf_tickers)}개", file=sys.stderr)
        except:
            print("ETF 조회 실패", file=sys.stderr)
        
        # ETN 전체 (390개)
        etn_tickers = []
        try:
            etn_tickers = stock.get_etn_ticker_list(today)
            print(f"ETN 종목: {len(etn_tickers)}개", file=sys.stderr)
        except:
            print("ETN 조회 실패", file=sys.stderr)
        
        # 지수 전체 (49개)
        index_tickers = []
        try:
            index_tickers = stock.get_index_ticker_list()
            print(f"지수: {len(index_tickers)}개", file=sys.stderr)
        except:
            print("지수 조회 실패", file=sys.stderr)
        
        # 전체 종목 정보 생성
        all_stocks = []
        
        # KOSPI 종목 처리
        for ticker in kospi_tickers:
            try:
                name = stock.get_market_ticker_name(ticker)
                if name and name != 'N/A':
                    stock_info = create_stock_info(ticker, name, 'KOSPI')
                    all_stocks.append(stock_info)
            except:
                continue
                
        # KOSDAQ 종목 처리
        for ticker in kosdaq_tickers:
            try:
                name = stock.get_market_ticker_name(ticker)
                if name and name != 'N/A':
                    stock_info = create_stock_info(ticker, name, 'KOSDAQ')
                    all_stocks.append(stock_info)
            except:
                continue
        
        # KONEX 종목 처리
        for ticker in konex_tickers:
            try:
                name = stock.get_market_ticker_name(ticker)
                if name and name != 'N/A':
                    stock_info = create_stock_info(ticker, name, 'KONEX')
                    all_stocks.append(stock_info)
            except:
                continue
        
        # ETF 전체 처리
        for ticker in etf_tickers:
            try:
                name = stock.get_etf_ticker_name(ticker)
                if name and name != 'N/A':
                    stock_info = create_stock_info(ticker, name, 'ETF')
                    all_stocks.append(stock_info)
            except:
                continue
        
        # ETN 전체 처리
        for ticker in etn_tickers:
            try:
                name = stock.get_etn_ticker_name(ticker)
                if name and name != 'N/A':
                    stock_info = create_stock_info(ticker, name, 'ETN')
                    all_stocks.append(stock_info)
            except:
                continue
        
        # 지수 처리
        for ticker in index_tickers:
            try:
                name = stock.get_index_ticker_name(ticker)
                if name and name != 'N/A':
                    stock_info = create_stock_info(ticker, name, 'INDEX')
                    all_stocks.append(stock_info)
            except:
                continue
        
        print(f"총 {len(all_stocks)}개 종목 수집 완료", file=sys.stderr)
        
        return {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'total_count': len(all_stocks),
            'kospi_count': len(kospi_tickers),
            'kosdaq_count': len(kosdaq_tickers),
            'data': all_stocks
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

def create_stock_info(ticker, name, market):
    """
    종목 정보 객체 생성
    """
    # 검색용 키워드 생성
    search_keywords = [name]
    
    # 자주 사용되는 키워드 추출
    keywords = []
    
    # ETF/ETN 특별 처리
    if market in ['ETF', 'ETN']:
        # ETF/ETN 브랜드명 추가
        if 'KODEX' in name:
            keywords.extend(['kodex', 'KODEX', '삼성'])
        if 'TIGER' in name:
            keywords.extend(['tiger', 'TIGER', '미래에셋'])
        if 'KBSTAR' in name:
            keywords.extend(['kbstar', 'KBSTAR', 'KB'])
        if 'ARIRANG' in name:
            keywords.extend(['arirang', 'ARIRANG', '한화'])
        if 'SMART' in name:
            keywords.extend(['smart', 'SMART'])
        if 'BNK' in name:
            keywords.extend(['bnk', 'BNK'])
            
        # ETF/ETN 섹터/테마 키워드 추가
        themes = {
            '반도체': ['반도체', 'semiconductor', '칩', 'chip'],
            '자동차': ['자동차', 'auto', 'automotive', '전기차'],
            '2차전지': ['2차전지', '배터리', 'battery', '전기차'],
            '은행': ['은행', 'bank', 'banking', '금융'],
            '코스닥': ['코스닥', 'kosdaq'],
            'S&P500': ['S&P500', 'SP500', '미국', 'US', 'america'],
            '나스닥': ['나스닥', 'nasdaq', '미국', 'US', 'america'],
            '원유': ['원유', 'oil', 'WTI', 'crude'],
            '금': ['금', 'gold'],
            '원달러': ['원달러', 'USD', '환율', 'dollar'],
            '유럽': ['유럽', 'europe', 'EU'],
            '일본': ['일본', 'japan', 'nikkei'],
            '중국': ['중국', 'china', 'CSI'],
            '바이오': ['바이오', 'bio', 'biotech'],
            'IT': ['IT', '정보기술', 'tech', 'technology'],
            '리츠': ['리츠', 'REIT', '부동산'],
            '채권': ['채권', 'bond', 'treasury']
        }
        
        for theme, theme_keywords in themes.items():
            if theme in name:
                keywords.extend(theme_keywords)
    
    # 지수 특별 처리
    elif market == 'INDEX':
        keywords.extend(['지수', 'index'])
        if '코스피' in name:
            keywords.extend(['코스피', 'kospi', 'KOSPI'])
        if '코스닥' in name:
            keywords.extend(['코스닥', 'kosdaq', 'KOSDAQ'])
        if 'KRX' in name:
            keywords.extend(['krx', 'KRX', '한국거래소'])
    
    # 대기업/그룹사 키워드
    major_groups = {
        '삼성': ['삼성', 'Samsung'],
        'LG': ['LG', 'Lucky'],  
        'SK': ['SK'],
        '현대': ['현대', 'Hyundai'],
        '카카오': ['카카오', 'Kakao'],
        '네이버': ['네이버', 'NAVER'],
        '포스코': ['포스코', 'POSCO'],
        'CJ': ['CJ'],
        '롯데': ['롯데', 'Lotte'],
        '한화': ['한화', 'Hanwha'],
        'KT': ['KT', '케이티'],
        'KB': ['KB'],
        '신한': ['신한'],
        '하나': ['하나'],
        '우리': ['우리']
    }
    
    for group_name, group_keywords in major_groups.items():
        if group_name in name:
            keywords.extend(group_keywords)
    
    # 업종별 키워드
    if any(word in name for word in ['바이오', '제약', '약품']):
        keywords.extend(['바이오', 'bio'])
    if any(word in name for word in ['게임', '엔터']):
        keywords.extend(['게임', 'game'])
    if any(word in name for word in ['화학', '케미칼']):
        keywords.extend(['화학', 'chemical'])
    if any(word in name for word in ['건설', '건설']):
        keywords.extend(['건설', 'construction'])
    if any(word in name for word in ['전자', '반도체']):
        keywords.extend(['전자', 'electronics'])
    if any(word in name for word in ['은행', '금융', '보험']):
        keywords.extend(['금융', 'finance', '은행', '보험'])
    if any(word in name for word in ['통신', '텔레콤']):
        keywords.extend(['통신', 'telecom'])
    if any(word in name for word in ['자동차', '모비스']):
        keywords.extend(['자동차', 'auto'])
    
    search_keywords.extend(keywords)
    
    # 영어 이름 추출 (괄호 안에 있는 경우)
    english_match = re.search(r'\(([A-Za-z\s&.]+)\)', name)
    if english_match:
        english_name = english_match.group(1).strip()
        search_keywords.append(english_name)
    
    # 중복 제거
    search_keywords = list(set(search_keywords))
    
    return {
        'symbol': ticker,
        'name': name,
        'market': market,
        'search_keywords': search_keywords
    }

def search_stocks(query, stocks_data, limit=20):
    """
    종목 검색
    """
    if not query or not stocks_data:
        return []
    
    query = query.lower().strip()
    results = []
    
    for stock_info in stocks_data:
        score = 0
        match_type = None
        
        # 종목코드 완전 일치 (최고 점수)
        if query == stock_info['symbol']:
            score = 100
            match_type = 'symbol_exact'
        
        # 종목코드 부분 일치
        elif query in stock_info['symbol']:
            score = 90
            match_type = 'symbol_partial'
        
        # 종목명 완전 일치
        elif query == stock_info['name'].lower():
            score = 85
            match_type = 'name_exact'
            
        # 종목명 시작 부분 일치
        elif stock_info['name'].lower().startswith(query):
            score = 80
            match_type = 'name_start'
            
        # 종목명 부분 일치
        elif query in stock_info['name'].lower():
            score = 70
            match_type = 'name_partial'
        
        # 검색 키워드 일치
        else:
            for keyword in stock_info['search_keywords']:
                if query in keyword.lower():
                    if query == keyword.lower():
                        score = 75  # 키워드 완전 일치
                        match_type = 'keyword_exact'
                    else:
                        score = 65  # 키워드 부분 일치 (점수 상향)
                        match_type = 'keyword_partial'
                    break
        
        # 매치된 경우 결과에 추가
        if score > 0:
            results.append({
                'symbol': stock_info['symbol'],
                'name': stock_info['name'],
                'market': stock_info['market'],
                'score': score,
                'match_type': match_type
            })
    
    # 점수순으로 정렬 후 limit 적용
    results.sort(key=lambda x: x['score'], reverse=True)
    
    # score 필드 제거 (API 응답에서는 불필요)
    for result in results:
        del result['score']
        del result['match_type']
    
    return results[:limit]

def main():
    parser = argparse.ArgumentParser(description='Complete Korean stock search using PyKRX')
    parser.add_argument('--search', '-s', type=str, help='Search query')
    parser.add_argument('--limit', '-l', type=int, default=20, help='Search result limit')
    parser.add_argument('--cache', '-c', type=str, help='Cache file path for stock data')
    parser.add_argument('--refresh', '-r', action='store_true', help='Force refresh stock data')
    
    args = parser.parse_args()
    
    try:
        # 캐시 파일 사용 여부
        cache_file = args.cache or 'all_stocks_cache.json'
        stocks_data = None
        
        # 캐시 파일 로드 시도 (새로고침이 아닌 경우)
        if not args.refresh:
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                    # 캐시가 오늘 것인지 확인
                    cache_date = cached_data.get('timestamp', '')
                    if cache_date.startswith(datetime.now().strftime('%Y-%m-%d')):
                        stocks_data = cached_data['data']
                        print(f"캐시에서 {len(stocks_data)}개 종목 로드", file=sys.stderr)
            except:
                pass
        
        # 캐시가 없거나 새로고침인 경우 새로 가져오기
        if stocks_data is None:
            result = get_all_korean_stocks()
            
            if not result['success']:
                raise Exception(result['error'])
                
            stocks_data = result['data']
            
            # 캐시 파일 저장
            try:
                with open(cache_file, 'w', encoding='utf-8') as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                print(f"종목 데이터를 {cache_file}에 캐시했습니다.", file=sys.stderr)
            except Exception as e:
                print(f"캐시 저장 실패: {e}", file=sys.stderr)
        
        # 검색 수행
        if args.search:
            search_results = search_stocks(args.search, stocks_data, args.limit)
            
            output = {
                'success': True,
                'query': args.search,
                'results': search_results,
                'total_found': len(search_results),
                'timestamp': datetime.now().isoformat()
            }
        else:
            # 전체 데이터 반환
            output = {
                'success': True,
                'total_count': len(stocks_data),
                'data': stocks_data[:args.limit] if args.limit else stocks_data,
                'timestamp': datetime.now().isoformat()
            }
        
        # JSON 출력
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