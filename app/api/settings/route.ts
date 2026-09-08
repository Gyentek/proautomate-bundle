export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'

const ENCRYPTED_FIELDS = [
  'etsyApiKey', 'openaiApiKey', 'gmailAppPassword',
  'wooConsumerKey', 'wooConsumerSecret', 'notionApiKey', 'slackWebhookUrl',
]

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })
    if (!settings) {
      return NextResponse.json({ settings: {} })
    }
    // Decrypt sensitive fields and mask for display
    const decrypted: Record<string, string> = {}
    const fields = ['etsyApiKey', 'etsyShopId', 'openaiApiKey', 'gmailAddress', 'gmailAppPassword',
      'wooStoreUrl', 'wooConsumerKey', 'wooConsumerSecret', 'notionApiKey', 'notionDatabaseId', 'slackWebhookUrl']
    for (const f of fields) {
      const val = (settings as any)?.[f] ?? ''
      if (ENCRYPTED_FIELDS.includes(f) && val) {
        const dec = decrypt(val)
        decrypted[f] = dec ? ('•'.repeat(Math.max(0, dec.length - 4)) + dec.slice(-4)) : ''
      } else {
        decrypted[f] = val ?? ''
      }
    }
    return NextResponse.json({ settings: decrypted })
  } catch (error: any) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const data: Record<string, string> = {}
    const fields = ['etsyApiKey', 'etsyShopId', 'openaiApiKey', 'gmailAddress', 'gmailAppPassword',
      'wooStoreUrl', 'wooConsumerKey', 'wooConsumerSecret', 'notionApiKey', 'notionDatabaseId', 'slackWebhookUrl']

    // Get existing settings for comparison
    const existing = await prisma.userSettings.findUnique({ where: { userId: session.user.id } })

    for (const f of fields) {
      const val = body?.[f] ?? ''
      // If the value is masked (contains bullet chars), keep existing encrypted value
      if (val && val.includes('\u2022') && existing) {
        data[f] = (existing as any)?.[f] ?? ''
      } else if (ENCRYPTED_FIELDS.includes(f) && val) {
        data[f] = encrypt(val)
      } else {
        data[f] = val
      }
    }

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save settings error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
