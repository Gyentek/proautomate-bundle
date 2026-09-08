export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type') ?? ''

    const history = await prisma.automationRun.findMany({
      where: { userId: session.user.id, automationType: type },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, details: true, status: true, itemCount: true, createdAt: true },
    })

    const contents = await prisma.generatedContent.findMany({
      where: { userId: session.user.id, automationType: type },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, content: true, createdAt: true },
    })

    return NextResponse.json({
      history: (history ?? []).map((h: any) => ({
        ...h,
        createdAt: h?.createdAt?.toISOString() ?? null,
      })),
      contents: (contents ?? []).map((c: any) => ({
        ...c,
        createdAt: c?.createdAt?.toISOString() ?? null,
      })),
    })
  } catch (error: any) {
    console.error('History error:', error)
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
  }
}
