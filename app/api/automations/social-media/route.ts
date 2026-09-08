export const dynamic = 'force-dynamic'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const body = await request.json()
    const { topic, tone, platforms } = body ?? {}
    if (!topic) {
      return new Response(JSON.stringify({ error: 'Topic is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const encoder = new TextEncoder()
    const platformList = (platforms ?? ['instagram', 'twitter', 'linkedin']).join(', ')

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Generating content...' })}\n\n`))

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
                  content: `You are an expert social media content strategist. Generate engaging, platform-optimized content.`,
                },
                {
                  role: 'user',
                  content: `Generate ${tone ?? 'professional'} social media posts about "${topic}" for these platforms: ${platformList}.\n\nFor each platform, respect character limits:\n- Instagram: max 2200 chars, include relevant hashtags\n- Twitter/X: max 280 chars, concise and impactful\n- LinkedIn: max 3000 chars, professional and insightful\n\nRespond in JSON format:\n{"posts": [{"platform": "platform_name", "content": "post content", "hashtags": "#relevant #hashtags"}]}\nRespond with raw JSON only.`,
                },
              ],
              stream: true,
              max_tokens: 2000,
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
                  try {
                    const parsed = JSON.parse(buffer)
                    const posts = (parsed?.posts ?? []).map((p: any) => ({
                      platform: p?.platform ?? '',
                      content: p?.content ?? '',
                      hashtags: p?.hashtags ?? '',
                      charCount: (p?.content?.length ?? 0),
                    }))
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { posts } })}\n\n`))

                    // Save to DB
                    await prisma.automationRun.create({
                      data: { userId: session.user.id, automationType: 'social-media', status: 'completed', details: `Generated content for: ${topic}`, itemCount: posts.length },
                    })
                    await prisma.generatedContent.create({
                      data: { userId: session.user.id, automationType: 'social-media', title: topic, content: JSON.stringify(posts) },
                    })
                  } catch {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse AI response' })}\n\n`))
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
    console.error('Social media error:', error)
    return new Response(JSON.stringify({ error: error?.message ?? 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
