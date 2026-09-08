'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PenTool, Sparkles, Copy, Check, ArrowLeft, Loader2, Clock, Instagram, Twitter, Linkedin, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface GeneratedPost {
  platform: string
  content: string
  hashtags: string
  charCount: number
}

interface HistoryItem {
  id: string
  title: string | null
  content: string
  createdAt: string
}

export function SocialMediaClient() {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('professional')
  const [platforms, setPlatforms] = useState({ instagram: true, twitter: true, linkedin: true })
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<GeneratedPost[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    fetch('/api/automations/history?type=social-media')
      .then((r) => r.json())
      .then((data: any) => setHistory(data?.contents ?? []))
      .catch(() => {})
  }, [])

  const generate = async () => {
    if (!topic.trim()) { toast.error('Please enter a topic'); return }
    const selectedPlatforms = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k)
    if (selectedPlatforms.length === 0) { toast.error('Select at least one platform'); return }

    setLoading(true)
    setProgress(0)
    setResults([])
    try {
      const res = await fetch('/api/automations/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tone, platforms: selectedPlatforms }),
      })
      if (!res.ok) { const e = await res.json(); toast.error(e?.error ?? 'Failed'); return }

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let partialRead = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        partialRead += decoder.decode(value, { stream: true })
        const lines = partialRead.split('\n')
        partialRead = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') return
            try {
              const parsed = JSON.parse(data)
              if (parsed?.status === 'processing') setProgress((p) => Math.min(p + 3, 95))
              else if (parsed?.status === 'completed') {
                setResults(parsed?.result?.posts ?? [])
                setProgress(100)
                return
              } else if (parsed?.status === 'error') {
                toast.error(parsed?.message ?? 'Error')
                return
              }
            } catch {}
          }
        }
      }
    } catch { toast.error('Generation failed') }
    finally { setLoading(false) }
  }

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard?.writeText?.(text)
    setCopied(platform)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(null), 2000)
  }

  const platformIcon = (p: string) => {
    if (p === 'instagram') return <Instagram className="h-5 w-5" />
    if (p === 'twitter') return <Twitter className="h-5 w-5" />
    return <Linkedin className="h-5 w-5" />
  }

  const platformColor = (p: string) => {
    if (p === 'instagram') return '#E4405F'
    if (p === 'twitter') return '#1DA1F2'
    return '#0A66C2'
  }

  const maxChars = (p: string) => {
    if (p === 'twitter') return 280
    if (p === 'linkedin') return 3000
    return 2200
  }

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#00D4AA] to-[#00F0C0] text-white">
            <PenTool className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">Social Media Planner</h1>
            <p className="text-sm text-muted-foreground">Generate platform-specific content with AI</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Topic / Keywords</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., Summer sale, new product launch, industry tips..."
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="funny">Funny</option>
                  <option value="inspirational">Inspirational</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Platforms</label>
                <div className="flex gap-3">
                  {(['instagram', 'twitter', 'linkedin'] as const).map((p) => (
                    <label key={p} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(platforms as any)?.[p] ?? false}
                        onChange={(e) => setPlatforms((prev) => ({ ...(prev ?? {}), [p]: e.target.checked }))}
                        className="rounded border-input accent-primary"
                      />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00D4AA] to-[#00D4AA]/80 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Generating...' : 'Generate Content'}
            </button>
          </div>
          {loading && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#00D4AA] to-[#6C47FF] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {(results?.length ?? 0) > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(results ?? []).map((post, i) => (
              <motion.div key={post?.platform ?? i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2" style={{ color: platformColor(post?.platform ?? '') }}>
                      {platformIcon(post?.platform ?? '')}
                      <span className="font-semibold capitalize">{post?.platform === 'twitter' ? 'Twitter / X' : post?.platform ?? ''}</span>
                    </div>
                    <span className={`text-xs font-mono ${
                      (post?.content?.length ?? 0) > maxChars(post?.platform ?? '') ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      {post?.content?.length ?? 0}/{maxChars(post?.platform ?? '')}
                    </span>
                  </div>
                  <div className="flex-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post?.content ?? ''}</div>
                  {post?.hashtags && (
                    <p className="mt-3 text-xs text-primary">{post.hashtags}</p>
                  )}
                  <button
                    onClick={() => copyToClipboard(`${post?.content ?? ''}${post?.hashtags ? '\n\n' + post.hashtags : ''}`, post?.platform ?? '')}
                    className="mt-4 flex items-center gap-1.5 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                  >
                    {copied === post?.platform ? <Check className="h-3.5 w-3.5 text-secondary" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === post?.platform ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* History */}
        {(history?.length ?? 0) > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Generations</h2>
            <div className="space-y-2">
              {(history ?? []).slice(0, 5).map((h) => (
                <div key={h?.id} className="rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{h?.title ?? 'Generated content'}</span>
                    <span className="text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{h?.createdAt ? new Date(h.createdAt).toLocaleDateString('en-US') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </main>
  )
}
