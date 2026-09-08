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
    const { topic, contentTypes, tone } = body ?? {}
    if (!topic) {
      return new Response(JSON.stringify({ error: 'Topic is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const types = contentTypes ?? ['blogPost', 'socialMedia', 'emailNewsletter']
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Generating content...' })}\n\n`))

          const typeInstructions = types.map((t: string) => {
            if (t === 'blogPost') return '"blogPost": A comprehensive blog post (800-1200 words) with title, introduction, body sections with headers, and conclusion.'
            if (t === 'socialMedia') return '"socialMedia": An engaging social media post (150-280 chars) with relevant hashtags.'
            if (t === 'emailNewsletter') return '"emailNewsletter": A compelling email newsletter with subject line, greeting, body content, and call-to-action.'
            return ''
          }).filter(Boolean).join('\n')

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
                  content: `You are an expert content strategist and writer. Generate high-quality, ${tone ?? 'professional'} content.`,
                },
                {
                  role: 'user',
                  content: `Generate content about "${topic}" in a ${tone ?? 'professional'} tone. Include these content types:\n${typeInstructions}\n\nRespond in JSON format with keys matching the content type names above. Each value should be the full content as a string.\nRespond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`,
                },
              ],
              stream: true,
              max_tokens: 4000,
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
                    const result = {
                      blogPost: parsed?.blogPost ?? '',
                      socialMedia: parsed?.socialMedia ?? '',
                      emailNewsletter: parsed?.emailNewsletter ?? '',
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result })}\n\n`))

                    await prisma.automationRun.create({
                      data: { userId: session.user.id, automationType: 'content-generator', status: 'completed', details: `Generated content for: ${topic}`, itemCount: types.length },
                    })
                    await prisma.generatedContent.create({
                      data: { userId: session.user.id, automationType: 'content-generator', title: topic, content: JSON.stringify(result) },
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
    console.error('Content generator error:', error)
    return new Response(JSON.stringify({ error: error?.message ?? 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
