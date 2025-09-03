import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApiResponse } from '@/types/api'

// 관심종목 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'ID parameter is required'
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

    // 존재 확인 및 사용자 검증
    const watchlistItem = await db.watchlist.findUnique({
      where: {
        id: id
      }
    })

    if (!watchlistItem) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Watchlist item not found'
      }, { status: 404 })
    }

    if (watchlistItem.userId !== userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 403 })
    }

    // 삭제
    await db.watchlist.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Watchlist item deleted successfully'
    })

  } catch (error) {
    console.error('Watchlist DELETE error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// 심볼로 관심종목 삭제 (편의 기능)  
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { symbol } = await request.json()
    
    if (!symbol) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbol is required'
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

    const deleted = await db.watchlist.deleteMany({
      where: {
        userId: userId,
        symbol: symbol
      }
    })

    if (deleted.count === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Watchlist item not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Watchlist item deleted successfully'
    })

  } catch (error) {
    console.error('Watchlist DELETE by symbol error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}