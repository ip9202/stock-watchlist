export const STOCK_MARKETS = {
  KOSPI: 'KOSPI',
  KOSDAQ: 'KOSDAQ',
  KONEX: 'KONEX'
} as const

export const PRICE_CHANGE_COLORS = {
  UP: 'text-red-600',
  DOWN: 'text-blue-600', 
  NEUTRAL: 'text-gray-600'
} as const

export const API_ENDPOINTS = {
  STOCKS_SEARCH: '/api/stocks/search',
  STOCKS_INFO: '/api/stocks',
  WATCHLIST: '/api/watchlist',
  STOCK_PRICE: '/api/stocks/price'
} as const

// 주요 종목 코드 (확장된 검색용)
export const MAJOR_STOCKS = [
  // 대형주
  { symbol: '005930', name: '삼성전자', searchNames: ['삼성전자', '삼성', 'Samsung'], market: 'KOSPI' },
  { symbol: '000660', name: 'SK하이닉스', searchNames: ['SK하이닉스', 'SK', '하이닉스', 'Hynix'], market: 'KOSPI' },
  { symbol: '035420', name: '네이버', searchNames: ['네이버', 'NAVER', '네이버주식회사'], market: 'KOSPI' },
  { symbol: '005935', name: '삼성전자우', searchNames: ['삼성전자우', '삼성우', '삼성전자우선주'], market: 'KOSPI' },
  { symbol: '207940', name: '삼성바이오로직스', searchNames: ['삼성바이오로직스', '삼성바이오', '바이오로직스'], market: 'KOSPI' },
  { symbol: '051910', name: 'LG화학', searchNames: ['LG화학', 'LG', '화학'], market: 'KOSPI' },
  { symbol: '006400', name: '삼성SDI', searchNames: ['삼성SDI', 'SDI', '삼성에스디아이'], market: 'KOSPI' },
  { symbol: '035720', name: '카카오', searchNames: ['카카오', 'Kakao', '다음카카오'], market: 'KOSPI' },
  { symbol: '068270', name: '셀트리온', searchNames: ['셀트리온', 'Celltrion'], market: 'KOSPI' },
  { symbol: '028260', name: '삼성물산', searchNames: ['삼성물산', '삼성상사', '물산'], market: 'KOSPI' },
  { symbol: '066570', name: 'LG전자', searchNames: ['LG전자', 'LG', '전자'], market: 'KOSPI' },
  { symbol: '105560', name: 'KB금융', searchNames: ['KB금융', 'KB', '국민은행'], market: 'KOSPI' },
  { symbol: '055550', name: '신한지주', searchNames: ['신한지주', '신한', '신한은행'], market: 'KOSPI' },
  { symbol: '096770', name: 'SK이노베이션', searchNames: ['SK이노베이션', 'SK', '이노베이션'], market: 'KOSPI' },
  { symbol: '017670', name: 'SK텔레콤', searchNames: ['SK텔레콤', 'SKT', '텔레콤'], market: 'KOSPI' },
  { symbol: '030200', name: 'KT', searchNames: ['KT', '케이티', '한국통신'], market: 'KOSPI' },
  { symbol: '003550', name: 'LG', searchNames: ['LG', '럭키골드스타'], market: 'KOSPI' },
  { symbol: '000270', name: '기아', searchNames: ['기아', '기아자동차', 'KIA'], market: 'KOSPI' },
  { symbol: '005380', name: '현대차', searchNames: ['현대차', '현대자동차', '현대', 'Hyundai'], market: 'KOSPI' },
  { symbol: '012330', name: '현대모비스', searchNames: ['현대모비스', '모비스', '현대'], market: 'KOSPI' },
  
  // 추가 중대형주
  { symbol: '003670', name: '포스코홀딩스', searchNames: ['포스코홀딩스', '포스코', 'POSCO'], market: 'KOSPI' },
  { symbol: '323410', name: '카카오뱅크', searchNames: ['카카오뱅크', '카뱅', 'KakaoBank'], market: 'KOSPI' },
  { symbol: '000810', name: '삼성화재', searchNames: ['삼성화재', '삼성화재해상보험'], market: 'KOSPI' },
  { symbol: '032830', name: '삼성생명', searchNames: ['삼성생명', '삼성생명보험'], market: 'KOSPI' },
  { symbol: '086790', name: '하나금융지주', searchNames: ['하나금융지주', '하나금융', '하나은행'], market: 'KOSPI' },
  { symbol: '316140', name: '우리금융지주', searchNames: ['우리금융지주', '우리금융', '우리은행'], market: 'KOSPI' },
  { symbol: '015760', name: '한국전력', searchNames: ['한국전력', '한전', 'KEPCO'], market: 'KOSPI' },
  { symbol: '018260', name: '삼성에스디에스', searchNames: ['삼성에스디에스', '삼성SDS', 'SDS'], market: 'KOSPI' },
  { symbol: '009150', name: '삼성전기', searchNames: ['삼성전기', '삼성전자부품'], market: 'KOSPI' },
  { symbol: '034730', name: 'SK', searchNames: ['SK', 'SK주식회사'], market: 'KOSPI' },
  { symbol: '011200', name: 'HMM', searchNames: ['HMM', '현대상선'], market: 'KOSPI' },
  { symbol: '024110', name: '기업은행', searchNames: ['기업은행', 'IBK', '중소기업은행'], market: 'KOSPI' },
  { symbol: '011070', name: 'LG이노텍', searchNames: ['LG이노텍', 'LG전자부품'], market: 'KOSPI' },
  { symbol: '161390', name: '한국타이어앤테크놀로지', searchNames: ['한국타이어', '한타', '타이어'], market: 'KOSPI' },
  { symbol: '034220', name: 'LG디스플레이', searchNames: ['LG디스플레이', 'LGD', '디스플레이'], market: 'KOSPI' },
  { symbol: '010950', name: 'S-Oil', searchNames: ['S-Oil', '에스오일', 'S오일'], market: 'KOSPI' },
  
  // IT/게임/바이오 관련
  { symbol: '036570', name: '엔씨소프트', searchNames: ['엔씨소프트', 'NCsoft', 'NC'], market: 'KOSPI' },
  { symbol: '251270', name: '넷마블', searchNames: ['넷마블', 'Netmarble'], market: 'KOSPI' },
  { symbol: '293490', name: '카카오게임즈', searchNames: ['카카오게임즈', '카카오게임'], market: 'KOSPI' },
  { symbol: '112040', name: '위메이드', searchNames: ['위메이드', 'Wemade'], market: 'KOSDAQ' },
  { symbol: '196170', name: '알테오젠', searchNames: ['알테오젠', 'Alteogen'], market: 'KOSDAQ' },
  { symbol: '145020', name: '휴젤', searchNames: ['휴젤', 'Hugel'], market: 'KOSDAQ' },
  { symbol: '302440', name: '셀투리온', searchNames: ['셀투리온', 'Celltrion'], market: 'KOSDAQ' },
  
  // 유통/서비스
  { symbol: '139480', name: '이마트', searchNames: ['이마트', 'E-MART'], market: 'KOSPI' },
  { symbol: '097950', name: 'CJ제일제당', searchNames: ['CJ제일제당', 'CJ', '제일제당'], market: 'KOSPI' },
  { symbol: '271560', name: '오리온', searchNames: ['오리온', 'Orion'], market: 'KOSPI' },
  { symbol: '051900', name: 'LG생활건강', searchNames: ['LG생활건강', 'LG화장품'], market: 'KOSPI' },
  { symbol: '090430', name: '아모레퍼시픽', searchNames: ['아모레퍼시픽', '아모레', 'Amore'], market: 'KOSPI' },
  { symbol: '282330', name: 'BGF리테일', searchNames: ['BGF리테일', 'BGF', '편의점'], market: 'KOSPI' },
  
  // 건설/화학/소재
  { symbol: '000720', name: '현대건설', searchNames: ['현대건설', '현대', '건설'], market: 'KOSPI' },
  { symbol: '004020', name: '현대제철', searchNames: ['현대제철', '제철'], market: 'KOSPI' },
  { symbol: '009830', name: '한화솔루션', searchNames: ['한화솔루션', '한화', '한화케미칼'], market: 'KOSPI' },
  { symbol: '011170', name: '롯데케미칼', searchNames: ['롯데케미칼', '롯데', '화학'], market: 'KOSPI' },
  { symbol: '002350', name: '넥센타이어', searchNames: ['넥센타이어', '넥센'], market: 'KOSPI' },
  { symbol: '192820', name: '코스맥스', searchNames: ['코스맥스', 'Cosmax'], market: 'KOSPI' },
] as const