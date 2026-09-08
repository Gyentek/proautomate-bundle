'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, PenTool, Database, FileText, Play, Settings2, Clock, Hash, ArrowRight, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface AutomationCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
  gradient: string
  runCount: number
  lastRun: string | null
}

export function DashboardClient() {
  const [stats, setStats] = useState<Record<string, { runCount: number; lastRun: string | null }>>({})
  const [runningId, setRunningId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/automations/stats')
      .then((r) => r.json())
      .then((data: any) => {
        if (data?.stats) setStats(data.stats)
      })
      .catch(() => {})
  }, [])

  const automations: AutomationCard[] = [
    {
      id: 'etsy-email',
      title: 'Etsy Thank-You Email',
      description: 'Fetch new Etsy orders and send personalized AI-generated thank-you emails automatically.',
      icon: <Mail className="h-6 w-6" />,
      href: '/automation/etsy-email',
      color: '#6C47FF',
      gradient: 'from-[#6C47FF] to-[#8B6FFF]',
      runCount: stats?.['etsy-email']?.runCount ?? 0,
      lastRun: stats?.['etsy-email']?.lastRun ?? null,
    },
    {
      id: 'social-media',
      title: 'Social Media Planner',
      description: 'Generate platform-specific content for Instagram, Twitter/X, and LinkedIn with AI.',
      icon: <PenTool className="h-6 w-6" />,
      href: '/automation/social-media',
      color: '#00D4AA',
      gradient: 'from-[#00D4AA] to-[#00F0C0]',
      runCount: stats?.['social-media']?.runCount ?? 0,
      lastRun: stats?.['social-media']?.lastRun ?? null,
    },
    {
      id: 'woocommerce-notion',
      title: 'WooCommerce → Notion CRM',
      description: 'Sync WooCommerce orders to your Notion database with AI customer analysis.',
      icon: <Database className="h-6 w-6" />,
      href: '/automation/woocommerce-notion',
      color: '#FF6B47',
      gradient: 'from-[#FF6B47] to-[#FF8F6B]',
      runCount: stats?.['woocommerce-notion']?.runCount ?? 0,
      lastRun: stats?.['woocommerce-notion']?.lastRun ?? null,
    },
    {
      id: 'content-generator',
      title: 'Content Generator',
      description: 'Generate blog posts, social media content, and email newsletters from a single topic.',
      icon: <FileText className="h-6 w-6" />,
      href: '/automation/content-generator',
      color: '#FFB347',
      gradient: 'from-[#FFB347] to-[#FFD080]',
      runCount: stats?.['content-generator']?.runCount ?? 0,
      lastRun: stats?.['content-generator']?.lastRun ?? null,
    },
  ]

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Automation <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Run powerful business automations — no Make.com or Zapier needed.</p>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {automations.map((auto, i) => (
          <motion.div
            key={auto.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-md transition-all duration-300 hover:border-border/80 hover:shadow-lg hover:-translate-y-1">
              {/* Gradient accent line */}
              <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${auto.gradient}`} />

              <div className="flex items-start justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
                  style={{ background: `linear-gradient(135deg, ${auto.color}, ${auto.color}CC)` }}
                >
                  {auto.icon}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{auto.runCount} runs</span>
                  {auto.lastRun && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(auto.lastRun).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  )}
                </div>
              </div>

              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{auto.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{auto.description}</p>

              <div className="mt-5 flex items-center gap-3">
                <Link
                  href={auto.href}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6C47FF] to-[#6C47FF]/80 px-4 py-2 text-sm font-medium text-white shadow transition-all hover:shadow-lg hover:shadow-primary/20"
                >
                  <Play className="h-3.5 w-3.5" /> Open
                </Link>
                <Link
                  href={auto.href}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Configure <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick setup reminder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-8 rounded-xl border border-border bg-card/50 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Quick Setup</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Head to <Link href="/settings" className="text-primary hover:underline font-medium">Settings</Link> to add your API keys for Etsy, WooCommerce, Notion, Gmail, and more. Your keys are encrypted and stored securely.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
