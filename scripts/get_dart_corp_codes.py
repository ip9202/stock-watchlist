#!/usr/bin/env python3
"""
DART API에서 회사 목록을 가져와서 종목코드와 회사고유번호 매핑 생성
"""

import requests
import json
import zipfile
import os
import tempfile
from dotenv import load_dotenv

load_dotenv('.env.local')

def download_corp_codes():
    """
    DART API에서 회사 목록을 다운로드하고 파싱
    """
    api_key = os.getenv('DART_API_KEY')
    if not api_key:
        print("DART API KEY가 필요합니다.")
        return None
    
    # 회사 목록 다운로드 API
    url = "https://opendart.fss.or.kr/api/corpCode.xml"
    params = {'crtfc_key': api_key}
    
    try:
        print("DART API에서 회사 목록을 다운로드 중...")
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        # 임시 파일에 저장
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_file:
            temp_file.write(response.content)
            temp_filename = temp_file.name
        
        # ZIP 파일 압축 해제
        with zipfile.ZipFile(temp_filename, 'r') as zip_ref:
            # 임시 디렉토리에 압축 해제
            with tempfile.TemporaryDirectory() as temp_dir:
                zip_ref.extractall(temp_dir)
                
                # XML 파일 읽기
                xml_file = os.path.join(temp_dir, 'CORPCODE.xml')
                if os.path.exists(xml_file):
                    with open(xml_file, 'r', encoding='utf-8') as f:
                        xml_content = f.read()
                        
                    # XML 파싱 (간단한 방법)
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(xml_content)
                    
                    corp_mapping = {}
                    major_stocks = ['005930', '000660', '035420', '207940', '051910', 
                                  '006400', '035720', '068270', '028260', '005380', '000270']
                    
                    for corp in root.findall('.//list'):
                        corp_code = corp.find('corp_code').text if corp.find('corp_code') is not None else ''
                        stock_code = corp.find('stock_code').text if corp.find('stock_code') is not None else ''
                        corp_name = corp.find('corp_name').text if corp.find('corp_name') is not None else ''
                        
                        # 주요 종목만 필터링
                        if stock_code in major_stocks:
                            corp_mapping[stock_code] = {
                                'corp_code': corp_code,
                                'corp_name': corp_name,
                                'stock_code': stock_code
                            }
                    
                    # 임시 파일 삭제
                    os.unlink(temp_filename)
                    
                    return corp_mapping
                else:
                    print("CORPCODE.xml 파일을 찾을 수 없습니다.")
                    return None
                    
    except Exception as e:
        print(f"오류 발생: {e}")
        return None

def main():
    corp_mapping = download_corp_codes()
    
    if corp_mapping:
        print("\n주요 종목 CORP_CODE 매핑:")
        print("=" * 50)
        
        # Python 딕셔너리 형태로 출력
        print("CORP_CODE_MAPPING = {")
        for stock_code, info in corp_mapping.items():
            print(f"    '{stock_code}': '{info['corp_code']}',  # {info['corp_name']}")
        print("}")
        
        print(f"\n총 {len(corp_mapping)}개 종목 매핑 완료")
        
        # JSON 파일로도 저장
        with open('corp_codes_mapping.json', 'w', encoding='utf-8') as f:
            json.dump(corp_mapping, f, ensure_ascii=False, indent=2)
        print("corp_codes_mapping.json 파일로 저장됨")
    else:
        print("회사 목록을 가져오는데 실패했습니다.")

if __name__ == "__main__":
    main()