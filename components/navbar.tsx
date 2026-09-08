'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Settings, Zap, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!session) return null

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C47FF] to-[#00D4AA]">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Pro<span className="gradient-text">Automate</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/dashboard"
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/dashboard'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/settings'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-1.5"><Settings className="h-4 w-4" /> Settings</span>
          </Link>
          <button
            onClick={() => signOut({ redirectTo: '/login' })}
            className="ml-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            <Link href="/settings" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent" onClick={() => setMobileOpen(false)}>Settings</Link>
            <button onClick={() => signOut({ redirectTo: '/login' })} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10">Logout</button>
          </div>
        </div>
      )}
    </nav>
  )
}
