'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Save, Loader2, ExternalLink, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SettingsData {
  etsyApiKey: string
  etsyShopId: string
  openaiApiKey: string
  gmailAddress: string
  gmailAppPassword: string
  wooStoreUrl: string
  wooConsumerKey: string
  wooConsumerSecret: string
  notionApiKey: string
  notionDatabaseId: string
  slackWebhookUrl: string
}

const defaultSettings: SettingsData = {
  etsyApiKey: '', etsyShopId: '', openaiApiKey: '',
  gmailAddress: '', gmailAppPassword: '',
  wooStoreUrl: '', wooConsumerKey: '', wooConsumerSecret: '',
  notionApiKey: '', notionDatabaseId: '', slackWebhookUrl: '',
}

interface FieldConfig {
  key: keyof SettingsData
  label: string
  type: 'text' | 'password'
  placeholder: string
  helpUrl?: string
  helpLabel?: string
}

const sections: { title: string; description: string; fields: FieldConfig[] }[] = [
  {
    title: 'Etsy API',
    description: 'Connect your Etsy shop for order tracking and automated emails.',
    fields: [
      { key: 'etsyApiKey', label: 'Etsy API Key', type: 'password', placeholder: 'etsyv2_xxxxx...', helpUrl: 'https://www.etsy.com/developers', helpLabel: 'Get API Key' },
      { key: 'etsyShopId', label: 'Etsy Shop ID', type: 'text', placeholder: 'YourShopName' },
    ],
  },
  {
    title: 'OpenAI',
    description: 'Used for AI-powered content generation across all automations.',
    fields: [
      { key: 'openaiApiKey', label: 'OpenAI API Key', type: 'password', placeholder: 'sk-...', helpUrl: 'https://platform.openai.com/api-keys', helpLabel: 'Get API Key' },
    ],
  },
  {
    title: 'Gmail SMTP',
    description: 'Send automated emails via your Gmail account.',
    fields: [
      { key: 'gmailAddress', label: 'Gmail Address', type: 'text', placeholder: 'you@gmail.com' },
      { key: 'gmailAppPassword', label: 'Gmail App Password', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx', helpUrl: 'https://myaccount.google.com/apppasswords', helpLabel: 'Generate App Password' },
    ],
  },
  {
    title: 'WooCommerce',
    description: 'Connect your WooCommerce store for order syncing.',
    fields: [
      { key: 'wooStoreUrl', label: 'Store URL', type: 'text', placeholder: 'https://yourstore.com' },
      { key: 'wooConsumerKey', label: 'Consumer Key', type: 'password', placeholder: 'ck_...' },
      { key: 'wooConsumerSecret', label: 'Consumer Secret', type: 'password', placeholder: 'cs_...' },
    ],
  },
  {
    title: 'Notion',
    description: 'Sync data to your Notion workspace.',
    fields: [
      { key: 'notionApiKey', label: 'Notion API Key', type: 'password', placeholder: 'ntn_...', helpUrl: 'https://www.notion.so/my-integrations', helpLabel: 'Create Integration' },
      { key: 'notionDatabaseId', label: 'Database ID', type: 'text', placeholder: 'abc123def456...' },
    ],
  },
  {
    title: 'Slack (Optional)',
    description: 'Get notifications in Slack when automations run.',
    fields: [
      { key: 'slackWebhookUrl', label: 'Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/services/...' },
    ],
  },
]

export function SettingsClient() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: any) => {
        if (data?.settings) setSettings({ ...defaultSettings, ...(data.settings ?? {}) })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleVisibility = (key: string) => {
    setVisibility((prev) => ({ ...(prev ?? {}), [key]: !prev?.[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Settings saved successfully!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
        <div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading settings...</div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-secondary" /> All API keys are encrypted before storage
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6C47FF] to-[#6C47FF]/80 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </motion.div>

      <div className="space-y-6">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground">{section.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">{field.label}</label>
                    {field.helpUrl && (
                      <a href={field.helpUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        {field.helpLabel} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={field.type === 'password' && !visibility?.[field.key] ? 'password' : 'text'}
                      value={(settings as any)?.[field.key] ?? ''}
                      onChange={(e) => setSettings((prev) => ({ ...(prev ?? defaultSettings), [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-input bg-background py-2.5 pl-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      placeholder={field.placeholder}
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => toggleVisibility(field.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {visibility?.[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  )
}
