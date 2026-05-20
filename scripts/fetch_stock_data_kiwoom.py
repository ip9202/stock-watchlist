#!/usr/bin/env python3
"""
키움증권 OpenAPI WebSocket을 사용한 주식 데이터 조회
WebSocket 연결 → 로그인 → 종목 등록 → 데이터 수신 → 종료
"""

import asyncio
import websockets
import json
import os
import sys
import argparse
from datetime import datetime


# WebSocket 설정
SOCKET_URL = 'wss://api.kiwoom.com:10000/api/dostk/websocket'  # 실전투자
# SOCKET_URL = 'wss://mockapi.kiwoom.com:10000/api/dostk/websocket'  # 모의투자


async def get_access_token(appkey, secretkey):
    """
    접근토큰 발급
    """
    import requests

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


async def fetch_stock_data(symbol, access_token):
    """
    WebSocket을 사용하여 주식 데이터 조회
    """
    result_data = {'received': False}

    async def receive_messages(websocket):
        """메시지 수신 핸들러"""
        try:
            message_count = 0
            async for message in websocket:
                message_count += 1
                response = json.loads(message)

                # 디버깅: 모든 메시지 출력
                print(f"[DEBUG] 메시지 #{message_count}: {json.dumps(response, ensure_ascii=False)[:500]}", file=sys.stderr)

                # PING 응답 그대로 전송
                if response.get('trnm') == 'PING':
                    await websocket.send(message)
                    continue

                # 로그인 응답
                if response.get('trnm') == 'LOGIN':
                    if response.get('return_code') != 0:
                        print(f"로그인 실패: {response.get('return_msg')}", file=sys.stderr)
                        result_data['error'] = response.get('return_msg')
                        return False
                    else:
                        print("로그인 성공", file=sys.stderr)

                        # 종목 등록
                        reg_packet = {
                            'trnm': 'REG',
                            'grp_no': '1',
                            'refresh': '0',
                            'data': [{
                                'item': [symbol],
                                'type': ['1']  # 1: 호가/잔고 (0: 체결가/잔고는 사용 안 함)
                            }]
                        }
                        await websocket.send(json.dumps(reg_packet))
                        print(f"종목 {symbol} 등록 완료", file=sys.stderr)

                # 실시간 데이터 수신 (현재가) - output이 있으면 데이터로 처리
                if 'output' in response and response['output']:
                    output = response.get('output', [{}])[0] if isinstance(response.get('output'), list) else response.get('output')
                    result_data['data'] = output
                    result_data['received'] = True
                    print(f"데이터 수신 완료: {output}", file=sys.stderr)
                    return True  # 데이터 받았으므로 종료

                # 최대 20개 메시지 수신 후 타임아웃
                if message_count >= 20:
                    print("최대 메시지 수신 도달, 타임아웃", file=sys.stderr)
                    result_data['error'] = '최대 대기 시간 초과'
                    return False

        except Exception as e:
            print(f"수신 오류: {e}", file=sys.stderr)
            result_data['error'] = str(e)
            return False

    # WebSocket 연결
    try:
        async with websockets.connect(SOCKET_URL) as websocket:
            # 로그인 패킷 전송
            login_packet = {
                'trnm': 'LOGIN',
                'token': access_token
            }
            await websocket.send(json.dumps(login_packet))
            print("로그인 패킷 전송 완료", file=sys.stderr)

            # 메시지 수신 (데이터 받으면 종료)
            await receive_messages(websocket)

    except Exception as e:
        result_data['error'] = f"WebSocket 연결 오류: {str(e)}"
        print(f"연결 오류: {e}", file=sys.stderr)

    return result_data


def parse_websocket_data(output, symbol):
    """
    WebSocket 수신 데이터 파싱
    """
    # 키움 WebSocket 출력 필드 (문서 참고)
    current_price = int(output.get('price', 0))
    volume = int(output.get('volume', 0))
    change_amount = int(output.get('change', 0))
    change_percent = float(output.get('change_rate', 0))

    return {
        'success': True,
        'symbol': symbol,
        'name': output.get('name', f"종목{symbol}"),
        'price': current_price,
        'changeAmount': change_amount,
        'changePercent': change_percent,
        'volume': volume,
        'marketCap': 0,
        'tradingValue': 0,
        'sharesOutstanding': 0,
        'volumeRatio': 0,
        'high': 0,
        'low': 0,
        'open': 0,
        'previousClose': 0,
        'high52w': 0,
        'low52w': 0,
        'timestamp': datetime.now().isoformat(),
        'extra_info': {
            'data_source': 'Kiwoom Securities WebSocket API',
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'is_etf': False
        }
    }


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


async def main_async():
    parser = argparse.ArgumentParser(description='Fetch stock data using Kiwoom WebSocket API')
    parser.add_argument('--symbol', '-s', type=str, help='Stock symbol (e.g., 005930)')

    args = parser.parse_args()

    if not args.symbol:
        parser.print_help()
        sys.exit(1)

    try:
        # API 키 읽기
        appkey, secretkey = read_api_keys()

        # 접근토큰 발급
        print("접근토큰 발급 중...", file=sys.stderr)
        token = await get_access_token(appkey, secretkey)
        print(f"토큰 발급 완료", file=sys.stderr)

        # WebSocket으로 데이터 조회
        print(f"종목 {args.symbol} 조회 중...", file=sys.stderr)
        result = await fetch_stock_data(args.symbol, token)

        if result.get('received') and result.get('data'):
            # 데이터 파싱
            stock_data = parse_websocket_data(result['data'], args.symbol)
            print(json.dumps(stock_data, ensure_ascii=False, indent=2))
        else:
            error_result = {
                'success': False,
                'error': result.get('error', '데이터 수신 실패'),
                'symbol': args.symbol,
                'timestamp': datetime.now().isoformat()
            }
            print(json.dumps(error_result, ensure_ascii=False, indent=2))
            sys.exit(1)

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'symbol': args.symbol,
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
