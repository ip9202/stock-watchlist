import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ApiResponse } from '@/types/api'
import { syncWatchlistRemove } from '@/lib/stock-auto/sync-client'

// @MX:NOTE: [AUTO] 세션 기반 userId 추출 - 미인증 시 null 반환
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }
  return session.user.id
}

// 관심종목 삭제
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'ID parameter is required'
      }, { status: 400 })
    }

    const userId = await getAuthenticatedUserId()

    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

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
        error: 'Forbidden'
      }, { status: 403 })
    }

    // 삭제
    await db.watchlist.delete({
      where: {
        id: id
      }
    })

    // stock_auto로 동기화 (fire-and-forget)
    syncWatchlistRemove(watchlistItem.symbol).catch((error) => {
      console.error(`Watchlist remove sync failed for ${watchlistItem.symbol}:`, error)
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
export async function POST(request: NextRequest, { params: _params }: { params: Promise<{ id: string }> }) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbol is required'
      }, { status: 400 })
    }

    const userId = await getAuthenticatedUserId()

    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

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
