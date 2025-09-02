#!/usr/bin/env python3
"""
DART 전자공시시스템 API를 활용한 공시정보 수집
OpenDart API Documentation: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019018
"""

import requests
import json
import sys
import argparse
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# .env.local 파일 로드
load_dotenv('.env.local')

class DartAPI:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('DART_API_KEY')
        if not self.api_key:
            raise ValueError("DART API KEY가 필요합니다. .env.local 파일에 DART_API_KEY를 설정하세요.")
        
        self.base_url = "https://opendart.fss.or.kr/api"
    
    def get_company_info(self, stock_code):
        """
        회사 기본정보 조회
        
        Args:
            stock_code (str): 종목코드 (예: '005930')
        
        Returns:
            dict: 회사 정보
        """
        try:
            url = f"{self.base_url}/company.json"
            params = {
                'crtfc_key': self.api_key,
                'corp_code': self._get_corp_code(stock_code)
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data.get('status') == '000':
                return {
                    'success': True,
                    'data': data
                }
            else:
                return {
                    'success': False,
                    'error': f"DART API 오류: {data.get('message', 'Unknown error')}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_disclosure_list(self, stock_code, start_date=None, end_date=None, page_no=1, page_count=10):
        """
        공시정보 목록 조회
        
        Args:
            stock_code (str): 종목코드
            start_date (str): 시작일자 (YYYYMMDD)
            end_date (str): 종료일자 (YYYYMMDD) 
            page_no (int): 페이지 번호
            page_count (int): 페이지당 건수 (1~100)
        
        Returns:
            dict: 공시 목록
        """
        try:
            # 기본값 설정 (최근 7일)
            if not end_date:
                end_date = datetime.now().strftime('%Y%m%d')
            if not start_date:
                start_date = (datetime.now() - timedelta(days=7)).strftime('%Y%m%d')
            
            url = f"{self.base_url}/list.json"
            params = {
                'crtfc_key': self.api_key,
                'corp_code': self._get_corp_code(stock_code),
                'bgn_de': start_date,
                'end_de': end_date,
                'page_no': page_no,
                'page_count': min(page_count, 100)  # 최대 100건
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data.get('status') == '000':
                return {
                    'success': True,
                    'data': data.get('list', []),
                    'total_count': data.get('total_count', 0),
                    'total_page': data.get('total_page', 0)
                }
            else:
                return {
                    'success': False,
                    'error': f"DART API 오류: {data.get('message', 'Unknown error')}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_major_disclosures(self, stock_codes, days=7):
        """
        여러 종목의 주요 공시정보를 한번에 가져오기
        
        Args:
            stock_codes (list): 종목코드 리스트
            days (int): 최근 며칠간의 공시 (기본 7일)
        
        Returns:
            dict: 통합된 공시 정보
        """
        results = {}
        
        for stock_code in stock_codes:
            try:
                disclosure_data = self.get_disclosure_list(
                    stock_code=stock_code,
                    start_date=(datetime.now() - timedelta(days=days)).strftime('%Y%m%d'),
                    end_date=datetime.now().strftime('%Y%m%d'),
                    page_count=20  # 각 종목당 최대 20건
                )
                
                if disclosure_data['success']:
                    # 주요 공시만 필터링
                    important_disclosures = []
                    for item in disclosure_data['data']:
                        report_nm = item.get('report_nm', '')
                        # 주요 공시 필터링 (정기보고서, 주요사항보고서, 지분공시 등)
                        if any(keyword in report_nm for keyword in [
                            '사업보고서', '분기보고서', '반기보고서',
                            '주요사항보고서', '지분변동신고서',
                            '공시정정신고서', '투자판단참고사항',
                            '기타공시', '합병', '분할', '증자',
                            '감자', '배당', '주식매수'
                        ]):
                            important_disclosures.append({
                                'rcept_no': item.get('rcept_no'),
                                'rcept_dt': item.get('rcept_dt'),
                                'report_nm': item.get('report_nm'),
                                'corp_name': item.get('corp_name'),
                                'flr_nm': item.get('flr_nm'),
                                'rm': item.get('rm'),
                                'url': f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rcept_no')}"
                            })
                    
                    results[stock_code] = {
                        'success': True,
                        'disclosures': important_disclosures[:10],  # 최대 10건
                        'total_count': len(important_disclosures)
                    }
                else:
                    results[stock_code] = disclosure_data
                    
            except Exception as e:
                results[stock_code] = {
                    'success': False,
                    'error': str(e)
                }
        
        return {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'data': results
        }
    
    def _get_corp_code(self, stock_code):
        """
        종목코드를 회사 고유번호로 변환
        실제로는 별도 API나 매핑 테이블이 필요하지만, 
        임시로 주요 종목들만 하드코딩
        """
        # 주요 종목 코드 -> DART 회사 고유번호 매핑 (DART API에서 가져온 정확한 코드)
        CORP_CODE_MAPPING = {
            '005930': '00126380',  # 삼성전자
            '000660': '00164779',  # SK하이닉스  
            '035420': '00266961',  # NAVER
            '207940': '00877059',  # 삼성바이오로직스
            '005935': '00126380',  # 삼성전자우 (동일)
            '051910': '00356361',  # LG화학
            '006400': '00126362',  # 삼성SDI
            '035720': '00258801',  # 카카오
            '068270': '00413046',  # 셀트리온
            '028260': '00149655',  # 삼성물산
            '005380': '00164742',  # 현대자동차
            '000270': '00106641',  # 기아
        }
        
        corp_code = CORP_CODE_MAPPING.get(stock_code)
        if not corp_code:
            raise ValueError(f"종목코드 {stock_code}에 대한 DART 회사 고유번호를 찾을 수 없습니다.")
        
        return corp_code


def main():
    parser = argparse.ArgumentParser(description='Fetch disclosure data from DART API')
    parser.add_argument('--symbol', '-s', type=str, help='Single stock symbol')
    parser.add_argument('--symbols', '-m', type=str, nargs='+', help='Multiple stock symbols')
    parser.add_argument('--days', '-d', type=int, default=7, help='Days to fetch (default: 7)')
    parser.add_argument('--output', '-o', type=str, help='Output file path')
    
    args = parser.parse_args()
    
    try:
        dart = DartAPI()
        
        if args.symbol:
            # 단일 종목
            result = dart.get_major_disclosures([args.symbol], days=args.days)
        elif args.symbols:
            # 다중 종목
            result = dart.get_major_disclosures(args.symbols, days=args.days)
        else:
            # 기본: 주요 종목들
            major_symbols = ['005930', '000660', '035420', '207940', '051910']
            result = dart.get_major_disclosures(major_symbols, days=args.days)
        
        # JSON 출력
        json_result = json.dumps(result, ensure_ascii=False, indent=2)
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(json_result)
            print(f"Results saved to {args.output}")
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