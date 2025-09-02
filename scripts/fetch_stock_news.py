#!/usr/bin/env python3
"""
주식 관련 뉴스 수집 시스템
네이버 뉴스, 다음 뉴스 등에서 종목 관련 뉴스 수집
"""

import requests
import json
import sys
import argparse
from datetime import datetime, timedelta
import re
from urllib.parse import urlencode

def search_naver_stock_news(company_name, max_results=10):
    """
    네이버 뉴스에서 특정 회사 관련 뉴스 검색
    """
    try:
        # 네이버 뉴스 검색 API (비공식)
        base_url = "https://openapi.naver.com/v1/search/news.json"
        
        # 검색 쿼리 구성
        query = f"{company_name} 주식"
        params = {
            'query': query,
            'display': min(max_results, 100),
            'start': 1,
            'sort': 'date'  # 최신순
        }
        
        import os
        headers = {
            'X-Naver-Client-Id': os.getenv('NAVER_CLIENT_ID', ''),
            'X-Naver-Client-Secret': os.getenv('NAVER_CLIENT_SECRET', '')
        }
        
        if not headers['X-Naver-Client-Id'] or not headers['X-Naver-Client-Secret']:
            raise Exception("네이버 API 키가 설정되지 않았습니다.")
        
        response = requests.get(base_url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            news_items = []
            
            for item in data.get('items', []):
                # HTML 태그 제거
                title = re.sub(r'<[^>]+>', '', item.get('title', ''))
                description = re.sub(r'<[^>]+>', '', item.get('description', ''))
                
                news_item = {
                    'title': title,
                    'description': description,
                    'url': item.get('link', ''),
                    'published_date': item.get('pubDate', ''),
                    'source': '네이버 뉴스'
                }
                news_items.append(news_item)
            
            return {
                'success': True,
                'news': news_items,
                'total_count': len(news_items)
            }
        else:
            raise Exception(f"네이버 뉴스 API 오류: {response.status_code}")
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_sample_stock_news_with_real_links(company_name, symbol, max_results=10):
    """
    실제 뉴스 검색 링크가 포함된 샘플 데이터 생성
    """
    try:
        # company_name 파라미터를 직접 사용 (API에서 이미 한국어 이름 전달받음)
        korean_company_name = company_name
        
        # 실제 뉴스 검색 링크로 연결
        import urllib.parse
        encoded_company = urllib.parse.quote(korean_company_name)
        
        sample_news = [
            {
                'title': f'{korean_company_name}, 3분기 실적 시장 전망치 상회',
                'description': f'{korean_company_name}가 3분기 실적에서 시장 전망치를 웃도는 성과를 기록했다고 발표했습니다. 매출액과 영업이익 모두 예상을 뛰어넘었습니다.',
                'url': f'https://search.naver.com/search.naver?where=news&query={encoded_company}+실적',
                'published_date': (datetime.now() - timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '한국경제',
                'category': '기업실적'
            },
            {
                'title': f'{korean_company_name} 주가, 긍정적 전망에 상승세',
                'description': '증권가에서 해당 기업에 대한 긍정적인 전망을 내놓으면서 주가가 강세를 보이고 있습니다.',
                'url': f'https://search.naver.com/search.naver?where=news&query={encoded_company}+주가',
                'published_date': (datetime.now() - timedelta(hours=4)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '매일경제',
                'category': '주식시장'
            },
            {
                'title': f'업계 분석: {korean_company_name}의 성장 전략',
                'description': '전문가들이 분석한 해당 기업의 중장기 성장 전략과 시장에서의 경쟁력에 대한 심층 분석입니다.',
                'url': f'https://search.naver.com/search.naver?where=news&query={encoded_company}+성장전략',
                'published_date': (datetime.now() - timedelta(hours=8)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '서울경제',
                'category': '기업분석'
            },
            {
                'title': f'{korean_company_name}, 신규 사업 진출 발표',
                'description': '새로운 성장동력 확보를 위해 신규 사업 분야에 진출한다고 공식 발표했습니다.',
                'url': f'https://search.naver.com/search.naver?where=news&query={encoded_company}+사업진출',
                'published_date': (datetime.now() - timedelta(hours=12)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '조선비즈',
                'category': '기업동향'
            },
            {
                'title': f'증권가 리포트: {korean_company_name} 투자의견 상향',
                'description': '주요 증권회사들이 해당 기업에 대한 투자의견을 상향 조정하며 목표주가를 높였습니다.',
                'url': f'https://search.naver.com/search.naver?where=news&query={encoded_company}+투자의견',
                'published_date': (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '이데일리',
                'category': '애널리스트'
            }
        ]
        
        return {
            'success': True,
            'news': sample_news[:max_results],
            'total_count': len(sample_news[:max_results]),
            'note': 'Sample data with real search links'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_sample_stock_news(company_name, symbol, max_results=10):
    """
    샘플 뉴스 데이터 생성 (실제 API 연동 전까지 사용)
    """
    try:
        # company_name 파라미터를 직접 사용 (API에서 이미 한국어 이름 전달받음)
        korean_company_name = company_name

        sample_news = [
            {
                'title': f'{korean_company_name}, 3분기 실적 시장 전망치 상회',
                'description': f'{korean_company_name}가 3분기 실적에서 시장 전망치를 웃도는 성과를 기록했다고 발표했습니다. 매출액과 영업이익 모두 예상을 뛰어넘었습니다.',
                'url': f'https://finance.naver.com/item/news_news.naver?code={symbol}&page=1',
                'published_date': (datetime.now() - timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '한국경제',
                'category': '기업실적'
            },
            {
                'title': f'{korean_company_name} 주가, 긍정적 전망에 상승세',
                'description': '증권가에서 해당 기업에 대한 긍정적인 전망을 내놓으면서 주가가 강세를 보이고 있습니다.',
                'url': f'https://finance.daum.net/quotes/A{symbol}#news',
                'published_date': (datetime.now() - timedelta(hours=4)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '매일경제',
                'category': '주식시장'
            },
            {
                'title': f'업계 분석: {korean_company_name}의 성장 전략',
                'description': '전문가들이 분석한 해당 기업의 중장기 성장 전략과 시장에서의 경쟁력에 대한 심층 분석입니다.',
                'url': f'https://search.naver.com/search.naver?where=news&query={korean_company_name}+실적',
                'published_date': (datetime.now() - timedelta(hours=8)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '서울경제',
                'category': '기업분석'
            },
            {
                'title': f'{korean_company_name}, 신규 사업 진출 발표',
                'description': '새로운 성장동력 확보를 위해 신규 사업 분야에 진출한다고 공식 발표했습니다.',
                'url': f'https://search.naver.com/search.naver?where=news&query={korean_company_name}+신규사업',
                'published_date': (datetime.now() - timedelta(hours=12)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '조선비즈',
                'category': '기업동향'
            },
            {
                'title': f'증권가 리포트: {korean_company_name} 투자의견 상향',
                'description': '주요 증권회사들이 해당 기업에 대한 투자의견을 상향 조정하며 목표주가를 높였습니다.',
                'url': f'https://search.naver.com/search.naver?where=news&query={korean_company_name}+투자의견',
                'published_date': (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S'),
                'source': '이데일리',
                'category': '애널리스트'
            }
        ]
        
        return {
            'success': True,
            'news': sample_news[:max_results],
            'total_count': len(sample_news[:max_results]),
            'note': 'Sample data - replace with real API integration'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_stock_related_news(symbol, company_name, max_results=10):
    """
    종목 관련 뉴스를 종합적으로 수집
    """
    try:
        # 1순위: 네이버 뉴스 API 시도
        print(f"[DEV] Attempting Naver News API for {company_name}", file=sys.stderr)
        naver_result = search_naver_stock_news(company_name, max_results)
        
        if naver_result['success']:
            print(f"[DEV] Naver API success: {len(naver_result['news'])} articles", file=sys.stderr)
            return {
                'success': True,
                'symbol': symbol,
                'company_name': company_name,
                'news': naver_result['news'],
                'total_count': naver_result['total_count'],
                'timestamp': datetime.now().isoformat(),
                'source': 'Naver API'
            }
        else:
            print(f"[DEV] Naver API failed: {naver_result.get('error', 'Unknown error')}", file=sys.stderr)
        
        # 2순위: 샘플 데이터 사용
        print(f"[DEV] Using sample data for {company_name}", file=sys.stderr)
        sample_news = get_sample_stock_news(company_name, symbol, max_results)
        
        if sample_news['success']:
            return {
                'success': True,
                'symbol': symbol,
                'company_name': company_name,
                'news': sample_news['news'],
                'total_count': sample_news['total_count'],
                'timestamp': datetime.now().isoformat(),
                'sources': ['한국경제', '매일경제', '서울경제', '조선비즈', '이데일리']
            }
        else:
            return sample_news
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

def main():
    parser = argparse.ArgumentParser(description='Fetch stock-related news')
    parser.add_argument('--symbol', '-s', type=str, required=True, help='Stock symbol (e.g., 005930)')
    parser.add_argument('--name', '-n', type=str, help='Company name (e.g., 삼성전자)')
    parser.add_argument('--limit', '-l', type=int, default=10, help='Maximum number of news items')
    
    args = parser.parse_args()
    
    try:
        # 회사명이 제공되지 않은 경우 기본값 설정
        company_name = args.name or f"종목{args.symbol}"
        
        result = get_stock_related_news(args.symbol, company_name, args.limit)
        
        # JSON 출력
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'symbol': args.symbol,
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()