'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Sparkles, Copy, Check, ArrowLeft, Loader2, Clock, Download, BookOpen, Share2, Mail as MailIcon } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ContentResult {
  blogPost: string
  socialMedia: string
  emailNewsletter: string
}

interface HistoryItem {
  id: string
  title: string | null
  createdAt: string
}

export function ContentGeneratorClient() {
  const [topic, setTopic] = useState('')
  const [contentTypes, setContentTypes] = useState({ blogPost: true, socialMedia: true, emailNewsletter: true })
  const [tone, setTone] = useState('professional')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ContentResult | null>(null)
  const [activeTab, setActiveTab] = useState('blogPost')
  const [copied, setCopied] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    fetch('/api/automations/history?type=content-generator')
      .then((r) => r.json())
      .then((data: any) => setHistory(data?.contents ?? []))
      .catch(() => {})
  }, [])

  const generate = async () => {
    if (!topic.trim()) { toast.error('Please enter a topic'); return }
    const selected = Object.entries(contentTypes).filter(([, v]) => v).map(([k]) => k)
    if (selected.length === 0) { toast.error('Select at least one content type'); return }

    setLoading(true)
    setProgress(0)
    setResult(null)
    try {
      const res = await fetch('/api/automations/content-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, contentTypes: selected, tone }),
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
              if (parsed?.status === 'processing') setProgress((p) => Math.min(p + 2, 95))
              else if (parsed?.status === 'completed') {
                setResult(parsed?.result ?? null)
                setProgress(100)
                const firstType = selected[0] ?? 'blogPost'
                setActiveTab(firstType)
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

  const copyContent = (key: string) => {
    const text = (result as any)?.[key] ?? ''
    navigator.clipboard?.writeText?.(text)
    setCopied(key)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadAsTxt = (key: string) => {
    const text = (result as any)?.[key] ?? ''
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${topic.replace(/\s+/g, '-').toLowerCase()}-${key}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const wordCount = (text: string) => (text ?? '').trim().split(/\s+/).filter(Boolean).length

  const tabs = [
    { key: 'blogPost', label: 'Blog Post', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'socialMedia', label: 'Social Media', icon: <Share2 className="h-4 w-4" /> },
    { key: 'emailNewsletter', label: 'Email Newsletter', icon: <MailIcon className="h-4 w-4" /> },
  ].filter((t) => (contentTypes as any)?.[t.key])

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#FFB347] to-[#FFD080] text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">Content Generator</h1>
            <p className="text-sm text-muted-foreground">Generate blog posts, social media, and email newsletters from a single topic</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Topic / Keyword</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., AI in e-commerce, sustainable fashion, productivity tips..."
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Content Types</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'blogPost', label: 'Blog Post' },
                    { key: 'socialMedia', label: 'Social Media Post' },
                    { key: 'emailNewsletter', label: 'Email Newsletter' },
                  ].map((ct) => (
                    <label key={ct.key} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(contentTypes as any)?.[ct.key] ?? false}
                        onChange={(e) => setContentTypes((prev) => ({ ...(prev ?? {}), [ct.key]: e.target.checked }))}
                        className="rounded border-input accent-primary"
                      />
                      {ct.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Tone / Style</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="educational">Educational</option>
                  <option value="persuasive">Persuasive</option>
                </select>
              </div>
            </div>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#FFB347] to-[#FFB347]/80 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Generating...' : 'Generate Content'}
            </button>
          </div>
          {loading && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#FFB347] to-[#6C47FF] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6">
            {/* Tab bar */}
            <div className="flex border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="mt-4 rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  {wordCount((result as any)?.[activeTab] ?? '')} words
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyContent(activeTab)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                  >
                    {copied === activeTab ? <Check className="h-3.5 w-3.5 text-secondary" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === activeTab ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => downloadAsTxt(activeTab)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                  >
                    <Download className="h-3.5 w-3.5" /> Export .txt
                  </button>
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {(result as any)?.[activeTab] ?? 'No content generated for this type.'}
              </div>
            </div>
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
