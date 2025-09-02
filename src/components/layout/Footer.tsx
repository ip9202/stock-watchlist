'use client'

import { TrendingUp, Github, Mail, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 브랜드 섹션 */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-bold text-gray-900">Stock Watchlist</h3>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              실시간 주식 정보와 공시 데이터를 통합하여 제공하는 
              스마트한 관심종목 관리 서비스입니다.
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <Heart className="h-4 w-4 text-red-500 mr-1" />
              <span>투자자를 위한 편리한 도구</span>
            </div>
          </div>

          {/* 서비스 */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">서비스</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="/" className="hover:text-blue-600 transition-colors">
                  관심종목 관리
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-blue-600 transition-colors">
                  실시간 주가 조회
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-blue-600 transition-colors">
                  공시정보 모니터링
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-blue-600 transition-colors">
                  종목 뉴스 분석
                </a>
              </li>
            </ul>
          </div>

          {/* 정보 */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">정보</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <span className="text-gray-500">데이터 제공</span>
              </li>
              <li className="pl-2">
                <span>Yahoo Finance API</span>
              </li>
              <li className="pl-2">
                <span>금감원 DART API</span>
              </li>
              <li className="pl-2">
                <span>한국거래소 KRX</span>
              </li>
              <li className="mt-3">
                <span className="text-xs text-gray-400">
                  투자 판단의 참고 자료로만 활용하시기 바랍니다.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 구분선과 저작권 */}
        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <p className="text-sm text-gray-500">
                © 2024 Stock Watchlist. All rights reserved.
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                <span>실시간 데이터 연동</span>
              </div>
              <div className="flex space-x-2">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a 
                  href="mailto:contact@stockwatchlist.com" 
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Contact"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}