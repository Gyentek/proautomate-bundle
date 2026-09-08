export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import nodemailer from 'nodemailer'

async function getUserSettings(userId: string) {
  const s = await prisma.userSettings.findUnique({ where: { userId } })
  if (!s) return null
  return {
    etsyApiKey: decrypt(s.etsyApiKey ?? ''),
    etsyShopId: s.etsyShopId ?? '',
    gmailAddress: s.gmailAddress ?? '',
    gmailAppPassword: decrypt(s.gmailAppPassword ?? ''),
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body ?? {}

    if (action === 'send') {
      return handleSend(session.user.id, body)
    }

    // Fetch orders and generate emails with streaming
    const settings = await getUserSettings(session.user.id)
    if (!settings?.etsyApiKey || !settings?.etsyShopId) {
      return NextResponse.json({ error: 'Please configure your Etsy API Key and Shop ID in Settings first.' }, { status: 400 })
    }

    const hours = body?.hours ?? 24
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Fetch orders from Etsy API
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Fetching orders from Etsy...' })}\n\n`))

          let orders: any[] = []
          try {
            const etsyRes = await fetch(
              `https://openapi.etsy.com/v3/application/shops/${settings.etsyShopId}/receipts?was_paid=true&limit=25`,
              {
                headers: {
                  'x-api-key': settings.etsyApiKey,
                  'Accept': 'application/json',
                },
              }
            )
            if (etsyRes.ok) {
              const data = await etsyRes.json()
              const cutoff = Date.now() - hours * 60 * 60 * 1000
              orders = (data?.results ?? []).filter((r: any) => {
                const ts = (r?.create_timestamp ?? 0) * 1000
                return ts > cutoff
              }).map((r: any) => ({
                orderId: String(r?.receipt_id ?? ''),
                customerName: r?.name ?? r?.buyer_user_id ?? 'Customer',
                customerEmail: r?.buyer_email ?? '',
                items: (r?.transactions ?? []).map((t: any) => t?.title ?? '').join(', ') || 'Item',
                total: `$${((r?.grandtotal?.amount ?? 0) / (r?.grandtotal?.divisor ?? 100)).toFixed(2)}`,
              }))
            } else {
              const errText = await etsyRes.text().catch(() => 'Unknown error')
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: `Etsy API error: ${etsyRes.status} - ${errText}` })}\n\n`))
              controller.close()
              return
            }
          } catch (etsyErr: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: `Failed to connect to Etsy API: ${etsyErr?.message ?? 'Unknown error'}` })}\n\n`))
            controller.close()
            return
          }

          if (orders.length === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { orders: [] } })}\n\n`))
            controller.close()
            return
          }

          // Generate emails with AI
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Generating personalized emails...' })}\n\n`))

          const orderList = orders.map((o: any) => `- ${o?.customerName}: ordered "${o?.items}" for ${o?.total}`).join('\n')
          const llmRes = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-5.4-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at writing warm, personalized thank-you emails for Etsy shop owners to send to their customers. Each email should feel genuine, mention the specific item purchased, and encourage future visits.',
                },
                {
                  role: 'user',
                  content: `Generate personalized thank-you emails for these Etsy orders:\n${orderList}\n\nRespond in JSON format with the following structure:\n{"emails": [{"orderId": "order id", "subject": "email subject", "body": "full email body"}]}\nRespond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`,
                },
              ],
              stream: true,
              max_tokens: 3000,
              response_format: { type: 'json_object' },
            }),
          })

          const reader = llmRes.body?.getReader()
          if (!reader) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Failed to connect to AI service' })}\n\n`))
            controller.close()
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''
          let partialRead = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            partialRead += decoder.decode(value, { stream: true })
            const lines = partialRead.split('\n')
            partialRead = lines.pop() ?? ''
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const d = line.slice(6)
                if (d === '[DONE]') {
                  // Parse buffer and merge with orders
                  try {
                    const parsed = JSON.parse(buffer)
                    const emails = parsed?.emails ?? []
                    const result = orders.map((o: any) => {
                      const email = emails.find((e: any) => String(e?.orderId) === String(o?.orderId))
                      return {
                        ...o,
                        emailPreview: email ? `Subject: ${email?.subject ?? ''}\n\n${email?.body ?? ''}` : 'Thank you for your purchase!',
                        sent: false,
                      }
                    })
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { orders: result } })}\n\n`))
                  } catch {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { orders: orders.map((o: any) => ({ ...o, emailPreview: 'Thank you for your purchase!', sent: false })) } })}\n\n`))
                  }
                  break
                }
                try {
                  const p = JSON.parse(d)
                  buffer += p?.choices?.[0]?.delta?.content ?? ''
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Generating...' })}\n\n`))
                } catch {}
              }
            }
          }

          // Record run
          await prisma.automationRun.create({
            data: {
              userId: session.user.id,
              automationType: 'etsy-email',
              status: 'completed',
              details: `Fetched ${orders.length} orders from last ${hours}h`,
              itemCount: orders.length,
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
    console.error('Etsy email error:', error)
    return NextResponse.json({ error: error?.message ?? 'Internal error' }, { status: 500 })
  }
}

async function handleSend(userId: string, body: any) {
  try {
    const settings = await getUserSettings(userId)
    if (!settings?.gmailAddress || !settings?.gmailAppPassword) {
      return NextResponse.json({ error: 'Please configure Gmail credentials in Settings.' }, { status: 400 })
    }

    const { orderId, orders } = body ?? {}
    const order = (orders ?? []).find((o: any) => o?.orderId === orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const emailParts = (order?.emailPreview ?? '').split('\n\n')
    const subject = (emailParts?.[0] ?? '').replace('Subject: ', '') || 'Thank you for your order!'
    const emailBody = emailParts.slice(1).join('\n\n') || (order?.emailPreview ?? '')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: settings.gmailAddress, pass: settings.gmailAppPassword },
    })

    await transporter.sendMail({
      from: settings.gmailAddress,
      to: order?.customerEmail || settings.gmailAddress,
      subject,
      text: emailBody,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: `Failed to send email: ${error?.message ?? 'Unknown error'}` }, { status: 500 })
  }
}
