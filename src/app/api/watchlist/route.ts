import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WatchlistItem, ApiResponse } from '@/types/stock'
import { Prisma } from '@prisma/client'

// 관심종목 조회
export async function GET(request: NextRequest) {
  try {
    // TODO: 실제 사용자 인증 구현 후 userId 가져오기  
    // 임시로 demo 사용자 사용
    const demoUser = await db.user.findUnique({
      where: { email: 'demo@example.com' }
    })
    
    if (!demoUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Demo user not found'
      }, { status: 500 })
    }
    
    const userId = demoUser.id

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

    // TODO: 실제 사용자 인증 구현 후 userId 가져오기  
    // 임시로 demo 사용자 사용
    const demoUser = await db.user.findUnique({
      where: { email: 'demo@example.com' }
    })
    
    if (!demoUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Demo user not found'
      }, { status: 500 })
    }
    
    const userId = demoUser.id

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

    // TODO: 실제 사용자 인증 구현 후 userId 가져오기  
    // 임시로 demo 사용자 사용
    const demoUser = await db.user.findUnique({
      where: { email: 'demo@example.com' }
    })
    
    if (!demoUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Demo user not found'
      }, { status: 500 })
    }
    
    const userId = demoUser.id

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