export const dynamic = 'force-dynamic'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encryption'

async function getUserSettings(userId: string) {
  const s = await prisma.userSettings.findUnique({ where: { userId } })
  if (!s) return null
  return {
    wooStoreUrl: s.wooStoreUrl ?? '',
    wooConsumerKey: decrypt(s.wooConsumerKey ?? ''),
    wooConsumerSecret: decrypt(s.wooConsumerSecret ?? ''),
    notionApiKey: decrypt(s.notionApiKey ?? ''),
    notionDatabaseId: s.notionDatabaseId ?? '',
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const settings = await getUserSettings(session.user.id)
    if (!settings?.wooStoreUrl || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
      return new Response(JSON.stringify({ error: 'Please configure WooCommerce credentials in Settings first.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    if (!settings?.notionApiKey || !settings?.notionDatabaseId) {
      return new Response(JSON.stringify({ error: 'Please configure Notion API Key and Database ID in Settings first.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 1. Fetch WooCommerce orders
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Fetching WooCommerce orders...' })}\n\n`))

          const authStr = Buffer.from(`${settings.wooConsumerKey}:${settings.wooConsumerSecret}`).toString('base64')
          const wooUrl = `${settings.wooStoreUrl.replace(/\/$/, '')}/wp-json/wc/v3/orders?per_page=10&orderby=date&order=desc`

          let wooOrders: any[] = []
          try {
            const wooRes = await fetch(wooUrl, {
              headers: { 'Authorization': `Basic ${authStr}`, 'Accept': 'application/json' },
            })
            if (!wooRes.ok) {
              const errText = await wooRes.text().catch(() => '')
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: `WooCommerce API error: ${wooRes.status} - ${errText}` })}\n\n`))
              controller.close()
              return
            }
            wooOrders = await wooRes.json()
          } catch (e: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: `Failed to connect to WooCommerce: ${e?.message ?? ''}` })}\n\n`))
            controller.close()
            return
          }

          if (!Array.isArray(wooOrders) || wooOrders.length === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { orders: [] } })}\n\n`))
            controller.close()
            return
          }

          // 2. Generate AI analysis for batch
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Generating AI customer analysis...' })}\n\n`))

          const orderSummaries = wooOrders.map((o: any) => {
            const name = `${o?.billing?.first_name ?? ''} ${o?.billing?.last_name ?? ''}`.trim() || 'Unknown'
            const items = (o?.line_items ?? []).map((i: any) => i?.name ?? '').join(', ')
            const total = o?.total ?? '0'
            return `Order #${o?.id}: ${name} - ${items} - $${total}`
          }).join('\n')

          let analyses: Record<string, string> = {}
          try {
            const llmRes = await fetch('https://apps.abacus.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'gpt-5.4-mini',
                messages: [
                  { role: 'system', content: 'You are a CRM analyst. Generate brief customer analysis notes for each order.' },
                  { role: 'user', content: `Analyze these orders and provide a brief customer analysis note for each:\n${orderSummaries}\n\nRespond in JSON format:\n{"analyses": [{"orderId": "order_id", "note": "analysis note"}]}\nRespond with raw JSON only.` },
                ],
                max_tokens: 2000,
                response_format: { type: 'json_object' },
              }),
            })
            if (llmRes.ok) {
              const llmData = await llmRes.json()
              const content = llmData?.choices?.[0]?.message?.content ?? ''
              try {
                const parsed = JSON.parse(content)
                for (const a of (parsed?.analyses ?? [])) {
                  analyses[String(a?.orderId ?? '')] = a?.note ?? ''
                }
              } catch {}
            }
          } catch {}

          // 3. Sync each order to Notion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Syncing to Notion...' })}\n\n`))

          const resultOrders: any[] = []
          for (const o of wooOrders) {
            const name = `${o?.billing?.first_name ?? ''} ${o?.billing?.last_name ?? ''}`.trim() || 'Unknown'
            const items = (o?.line_items ?? []).map((i: any) => i?.name ?? '').join(', ')
            const total = o?.total ?? '0'
            const analysis = analyses[String(o?.id ?? '')] ?? 'No analysis available'
            const orderId = String(o?.id ?? '')

            const orderData: any = {
              orderId,
              customerName: name,
              product: items || 'N/A',
              amount: `$${total}`,
              analysisNote: analysis,
              status: 'syncing' as const,
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'order-update', order: orderData })}\n\n`))

            try {
              await fetch('https://api.notion.com/v1/pages', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${settings.notionApiKey}`,
                  'Notion-Version': '2022-06-28',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  parent: { database_id: settings.notionDatabaseId },
                  properties: {
                    'Name': { title: [{ text: { content: name } }] },
                    'Order ID': { rich_text: [{ text: { content: orderId } }] },
                    'Products': { rich_text: [{ text: { content: items || 'N/A' } }] },
                    'Amount': { rich_text: [{ text: { content: `$${total}` } }] },
                    'AI Analysis': { rich_text: [{ text: { content: analysis.slice(0, 2000) } }] },
                  },
                }),
              })
              orderData.status = 'success'
            } catch (notionErr: any) {
              orderData.status = 'error'
              orderData.error = notionErr?.message ?? 'Notion sync failed'
            }

            resultOrders.push(orderData)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'order-update', order: orderData })}\n\n`))
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { orders: resultOrders } })}\n\n`))

          await prisma.automationRun.create({
            data: {
              userId: session.user.id,
              automationType: 'woocommerce-notion',
              status: 'completed',
              details: `Synced ${resultOrders.length} orders to Notion`,
              itemCount: resultOrders.length,
            },
          })
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: err?.message ?? 'Unknown error' })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch (error: any) {
    console.error('WooCommerce-Notion error:', error)
    return new Response(JSON.stringify({ error: error?.message ?? 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
