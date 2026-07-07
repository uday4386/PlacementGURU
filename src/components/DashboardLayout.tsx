import { Suspense, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearAuthSession } from '../lib/auth'
import {
  Bell,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../lib/utils'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface DashboardLayoutProps {
  portal: 'admin' | 'student' | 'coordinator'
  navItems: NavItem[]
  userInitials: string
  userRole: string
  userEmail: string
  department?: string
  children: React.ReactNode
}

function isNavActive(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardLayout({
  portal,
  navItems,
  userInitials,
  userRole,
  userEmail,
  department,
  children,
}: DashboardLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const homeHref = navItems[0]?.href ?? '/'

  return (
    <div className="min-h-screen bg-transparent">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-foreground">CampusConnect</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {portal} portal
            </div>
          </div>
        </div>

        <nav className="space-y-0.5 p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isNavActive(location.pathname, item.href, homeHref)
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => {
              clearAuthSession()
              navigate('/login')
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            className="-ml-2 p-2 lg:hidden"
            aria-label="Toggle nav"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="max-w-xl flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search students, companies, drives..."
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-700 text-xs font-bold text-white">
              {userInitials}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold capitalize leading-tight">{userRole} User</div>
              <div className="text-[10px] leading-tight text-muted-foreground">
                {department ? `${department} · ${userEmail}` : userEmail}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <Suspense
            fallback={
              <div className="flex h-48 items-center justify-center text-sm font-medium text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Loading content...</span>
                </div>
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

