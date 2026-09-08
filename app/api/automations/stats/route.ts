export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const types = ['etsy-email', 'social-media', 'woocommerce-notion', 'content-generator']
    const stats: Record<string, { runCount: number; lastRun: string | null }> = {}

    for (const type of types) {
      const count = await prisma.automationRun.count({
        where: { userId: session.user.id, automationType: type },
      })
      const lastRun = await prisma.automationRun.findFirst({
        where: { userId: session.user.id, automationType: type },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      stats[type] = {
        runCount: count,
        lastRun: lastRun?.createdAt?.toISOString() ?? null,
      }
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
