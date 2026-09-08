'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mail, Search, Send, Loader2, Clock, User, Package, ArrowLeft, CheckCircle2, XCircle, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Order {
  orderId: string
  customerName: string
  customerEmail: string
  items: string
  total: string
  emailPreview: string
  sent: boolean
}

interface HistoryItem {
  id: string
  details: string
  status: string
  createdAt: string
}

export function EtsyEmailClient() {
  const [hours, setHours] = useState(24)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    fetch('/api/automations/history?type=etsy-email')
      .then((r) => r.json())
      .then((data: any) => setHistory(data?.history ?? []))
      .catch(() => {})
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    setOrders([])
    setProgress(0)
    try {
      const res = await fetch('/api/automations/etsy-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch', hours }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err?.error ?? 'Failed to fetch orders')
        return
      }

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
              if (parsed?.status === 'processing') {
                setProgress((p) => Math.min(p + 5, 95))
              } else if (parsed?.status === 'completed') {
                setOrders(parsed?.result?.orders ?? [])
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
    } catch (e: any) {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = async (orderId: string) => {
    setSendingId(orderId)
    try {
      const res = await fetch('/api/automations/etsy-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', orderId, orders }),
      })
      const data = await res.json()
      if (res.ok) {
        setOrders((prev) => (prev ?? []).map((o) => o?.orderId === orderId ? { ...(o ?? {}), sent: true } as Order : o))
        toast.success(`Email sent to ${(orders ?? []).find((o) => o?.orderId === orderId)?.customerName ?? 'customer'}`)
      } else {
        toast.error(data?.error ?? 'Failed to send email')
      }
    } catch {
      toast.error('Failed to send email')
    } finally {
      setSendingId(null)
    }
  }

  const sendAll = async () => {
    setSendingAll(true)
    const unsent = (orders ?? []).filter((o) => !o?.sent)
    for (const order of unsent) {
      await sendEmail(order?.orderId ?? '')
    }
    setSendingAll(false)
    toast.success('All emails sent!')
  }

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C47FF] to-[#8B6FFF] text-white">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">Etsy Thank-You Email</h1>
              <p className="text-sm text-muted-foreground">Fetch orders and send AI-generated thank-you emails</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Check orders from last</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value) || 24)}
                  className="w-24 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  min={1}
                  max={168}
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            </div>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6C47FF] to-[#6C47FF]/80 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Fetching...' : 'Fetch Orders & Generate Emails'}
            </button>
          </div>
          {loading && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#6C47FF] to-[#00D4AA] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Generating personalized emails with AI...</p>
            </div>
          )}
        </div>

        {/* Orders */}
        {(orders?.length ?? 0) > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {orders.length} Order{orders.length !== 1 ? 's' : ''} Found
              </h2>
              <button
                onClick={sendAll}
                disabled={sendingAll || (orders ?? []).every((o) => o?.sent)}
                className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow transition-all hover:opacity-90 disabled:opacity-50"
              >
                {sendingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send All Emails
              </button>
            </div>

            <div className="space-y-4">
              {(orders ?? []).map((order, i) => (
                <motion.div
                  key={order?.orderId ?? i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{order?.customerName ?? 'Unknown'}</span>
                        {order?.sent && <CheckCircle2 className="h-4 w-4 text-secondary" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-3.5 w-3.5" /> {order?.items ?? 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Total: {order?.total ?? '$0.00'}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedEmail(expandedEmail === order?.orderId ? null : order?.orderId ?? null)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                      <button
                        onClick={() => sendEmail(order?.orderId ?? '')}
                        disabled={order?.sent || sendingId === order?.orderId}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                      >
                        {sendingId === order?.orderId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {order?.sent ? 'Sent' : 'Send'}
                      </button>
                    </div>
                  </div>
                  {expandedEmail === order?.orderId && (
                    <div className="mt-4 rounded-lg border border-border/50 bg-background p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                      {order?.emailPreview ?? 'No preview available'}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {(history?.length ?? 0) > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Runs</h2>
            <div className="space-y-2">
              {(history ?? []).slice(0, 10).map((h) => (
                <div key={h?.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-sm">
                  {h?.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-foreground">{h?.details ?? 'Run'}</span>
                  <span className="ml-auto text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{h?.createdAt ? new Date(h.createdAt).toLocaleString('en-US') : 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </main>
  )
}
