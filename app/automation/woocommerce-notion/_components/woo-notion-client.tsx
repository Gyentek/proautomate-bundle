'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Database, RefreshCw, ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, User, Package, DollarSign, FileText } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface SyncOrder {
  orderId: string
  customerName: string
  product: string
  amount: string
  analysisNote: string
  status: 'pending' | 'syncing' | 'success' | 'error'
  error?: string
}

interface HistoryItem {
  id: string
  details: string | null
  status: string
  createdAt: string
}

export function WooNotionClient() {
  const [syncing, setSyncing] = useState(false)
  const [orders, setOrders] = useState<SyncOrder[]>([])
  const [progress, setProgress] = useState(0)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/automations/history?type=woocommerce-notion')
      .then((r) => r.json())
      .then((data: any) => setHistory(data?.history ?? []))
      .catch(() => {})
  }, [])

  const syncOrders = async () => {
    setSyncing(true)
    setOrders([])
    setProgress(0)
    try {
      const res = await fetch('/api/automations/woocommerce-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err?.error ?? 'Sync failed')
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
                setProgress((p) => Math.min(p + 3, 95))
                if (parsed?.message) toast.info(parsed.message, { id: 'sync-progress' })
              } else if (parsed?.status === 'order-update') {
                setOrders((prev) => {
                  const existing = [...(prev ?? [])]
                  const idx = existing.findIndex((o) => o?.orderId === parsed?.order?.orderId)
                  if (idx >= 0) { existing[idx] = parsed.order; return existing }
                  return [...existing, parsed.order]
                })
              } else if (parsed?.status === 'completed') {
                setOrders(parsed?.result?.orders ?? [])
                setProgress(100)
                toast.success(`Synced ${parsed?.result?.orders?.length ?? 0} orders to Notion`)
                return
              } else if (parsed?.status === 'error') {
                toast.error(parsed?.message ?? 'Error')
                return
              }
            } catch {}
          }
        }
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B47] to-[#FF8F6B] text-white">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">WooCommerce → Notion CRM</h1>
            <p className="text-sm text-muted-foreground">Sync orders to Notion with AI customer analysis</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            This will fetch your latest WooCommerce orders, generate AI analysis for each customer, and add them to your Notion database.
          </p>
          <button
            onClick={syncOrders}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#FF6B47] to-[#FF6B47]/80 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Syncing...' : 'Sync Latest Orders to Notion'}
          </button>
          {syncing && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#FF6B47] to-[#FFB347] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {(orders?.length ?? 0) > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-foreground">{orders.length} Orders Synced</h2>
            {(orders ?? []).map((order, i) => (
              <motion.div key={order?.orderId ?? i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {order?.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : order?.status === 'error' ? <XCircle className="h-4 w-4 text-destructive" /> : <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{order?.customerName ?? 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{order?.product ?? 'N/A'}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{order?.amount ?? '0'}</span>
                      </div>
                    </div>
                    {order?.analysisNote && (
                      <button onClick={() => setExpandedId(expandedId === order?.orderId ? null : order?.orderId ?? null)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent">
                        <FileText className="h-3.5 w-3.5" /> AI Analysis
                      </button>
                    )}
                  </div>
                  {expandedId === order?.orderId && order?.analysisNote && (
                    <div className="mt-3 rounded-lg border border-border/50 bg-background p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                      {order.analysisNote}
                    </div>
                  )}
                  {order?.error && <p className="mt-2 text-xs text-destructive">{order.error}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {(history?.length ?? 0) > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Syncs</h2>
            <div className="space-y-2">
              {(history ?? []).slice(0, 10).map((h) => (
                <div key={h?.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-sm">
                  {h?.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-foreground">{h?.details ?? 'Sync'}</span>
                  <span className="ml-auto text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{h?.createdAt ? new Date(h.createdAt).toLocaleString('en-US') : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </main>
  )
}
