import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { WatchlistItem } from '@/types/stock'
import { ApiResponse } from '@/types/api'
import { Prisma } from '@prisma/client'
import { syncWatchlistAdd } from '@/lib/stock-auto/sync-client'

// @MX:ANCHOR: [AUTO] 세션 기반 userId 추출 헬퍼 - GET/POST/PUT 모두 사용
// @MX:REASON: watchlist 모든 메서드에서 세션 인증 공통 처리
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }
  return session.user.id
}

// 관심종목 조회
export async function GET(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()

    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const watchlist = await db.watchlist.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json<ApiResponse<WatchlistItem[]>>({
      success: true,
      data: watchlist
    })

  } catch (error) {
    console.error('Watchlist GET error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// 관심종목 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, name } = body

    if (!symbol || !name) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbol and name are required'
      }, { status: 400 })
    }

    const userId = await getAuthenticatedUserId()

    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // 중복 확인
    const existing = await db.watchlist.findUnique({
      where: {
        userId_symbol: {
          userId: userId,
          symbol: symbol
        }
      }
    })

    if (existing) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Stock already exists in watchlist'
      }, { status: 409 })
    }

    // 현재 최대 order 값 구하기
    const maxOrder = await db.watchlist.aggregate({
      where: {
        userId: userId
      },
      _max: {
        order: true
      }
    })

    const newOrder = (maxOrder._max.order || 0) + 1

    const watchlistItem = await db.watchlist.create({
      data: {
        userId: userId,
        symbol: symbol,
        name: name,
        order: newOrder
      }
    })

    // 시장구분 결정: 종목코드 5번째 자리가 0~3이면 KOSPI, 4~9면 KOSDAQ
    // (한국 주식시장 코딩 규칙: 005930 삼성전자는 KOSPI, 066570 LG전자는 KOSDAQ)
    const fifthDigit = symbol.length >= 5 ? parseInt(symbol[4]) : 0
    const market = fifthDigit <= 3 ? 'KOSPI' : 'KOSDAQ'

    // stock_auto로 동기화 (fire-and-forget)
    syncWatchlistAdd(symbol, name, market).catch((error) => {
      console.error(`Watchlist add sync failed for ${symbol}:`, error)
    })

    return NextResponse.json<ApiResponse<WatchlistItem>>({
      success: true,
      data: watchlistItem
    }, { status: 201 })

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Stock already exists in watchlist'
      }, { status: 409 })
    }
    console.error('Watchlist POST error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// 관심종목 순서 변경
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body

    if (!Array.isArray(items)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Items array is required'
      }, { status: 400 })
    }

    const userId = await getAuthenticatedUserId()

    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // 트랜잭션으로 순서 업데이트
    await db.$transaction(
      items.map((item: { id: string; order: number }) =>
        db.watchlist.update({
          where: {
            id: item.id,
            userId: userId // 사용자 검증
          },
          data: {
            order: item.order
          }
        })
      )
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Watchlist order updated successfully'
    })

  } catch (error) {
    console.error('Watchlist PUT error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
