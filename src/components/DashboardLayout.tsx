import { Suspense, useState, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { clearAuthSession, getAuthSession } from '../lib/auth'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAcademicYear, useAcademicYearOptions } from '../lib/AcademicYearContext'
import {
  initializeStore,
  loadPlacementNotifications,
  loadDeptBroadcasts,
  syncPlacementNotifications,
  useStoreState,
} from '../lib/placeproStore'

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
  const [profileOpen, setProfileOpen] = useState(false)
  const homeHref = navItems[0]?.href ?? '/'
  const { selectedYear, setSelectedYear, academicYears } = useAcademicYear()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const yearOptions = useAcademicYearOptions()

  const liveNotifications = useStoreState(loadPlacementNotifications) ?? []
  const deptBroadcasts = useStoreState(loadDeptBroadcasts) ?? []
  const [readBroadcastIds, setReadBroadcastIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('placepro-read-broadcasts') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    syncPlacementNotifications()
    const interval = setInterval(() => {
      syncPlacementNotifications()
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const checkBroadcasts = () => {
      try {
        setReadBroadcastIds(JSON.parse(localStorage.getItem('placepro-read-broadcasts') || '[]'))
      } catch {}
    }
    window.addEventListener('storage', checkBroadcasts)
    checkBroadcasts()
    return () => window.removeEventListener('storage', checkBroadcasts)
  }, [liveNotifications])

  const session = getAuthSession()
  const studentRoll = session?.rollNumber || ''

  const unreadCount = useMemo(() => {
    if (portal === 'student') {
      const myPlacementNotifs = liveNotifications.filter(
        (n) => n.rollNumber?.toLowerCase() === studentRoll.toLowerCase()
      )
      const placementUnread = myPlacementNotifs.filter((n) => !n.read).length
      const broadcastUnread = deptBroadcasts.filter((b) => !readBroadcastIds.includes(b.id)).length
      return placementUnread + broadcastUnread
    } else if (portal === 'coordinator') {
      const coordEmail = session?.email?.trim().toUpperCase() || ''
      const myNotifs = liveNotifications.filter((n) => n.rollNumber?.toUpperCase() === coordEmail)
      return myNotifs.filter((n) => !n.read).length
    } else {
      // For Admin, do not count student placement notifications as unread, or handle via separate read tracking
      const adminReadStr = localStorage.getItem('placepro-admin-read-notifs') || '[]'
      try {
        const adminRead = JSON.parse(adminReadStr)
        return liveNotifications.filter((n) => !adminRead.includes(n.id)).length
      } catch {
        return liveNotifications.filter((n) => !n.read).length
      }
    }
  }, [portal, liveNotifications, deptBroadcasts, readBroadcastIds, studentRoll])

  function handleNotificationsClick() {
    try {
      if (portal === 'student') {
        const bAll = deptBroadcasts.map((b: any) => b.id)
        localStorage.setItem('placepro-read-broadcasts', JSON.stringify(bAll))
      }
    } catch (err) {
      console.error('Failed to handle bell click', err)
    }
    navigate(
      portal === 'admin'
        ? '/admin/notifications'
        : portal === 'coordinator'
          ? '/coordinator/notifications'
          : '/student/notifications',
    )
  }

  const statusIcon = (status: string) => {
    if (status === 'ACTIVE') return '[Active]'
    if (status === 'ARCHIVED') return '[Archived]'
    return '[Upcoming]'
  }

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
          <img
            src="/placego-logo.png"
            alt="PlaceGO!"
            className="h-9 w-9 rounded-lg object-contain"
          />
          <div>
            <div className="font-bold tracking-tight text-foreground">PlaceGO!</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {portal} portal
            </div>
          </div>
        </div>

        <nav className="space-y-0.5 p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isNavActive(location.pathname, item.href, homeHref)
            const isNotifItem =
              item.href.endsWith('/notifications') ||
              item.label === 'Notifications' ||
              item.label === 'Broadcasts'
            const dynamicBadge = isNotifItem
              ? unreadCount > 0
                ? 'NEW'
                : undefined
              : item.badge
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={(e) => {
                  setSidebarOpen(false)
                  if (isNotifItem) {
                    e.preventDefault()
                    handleNotificationsClick()
                  }
                }}
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
                {dynamicBadge !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : isNotifItem
                          ? 'bg-destructive/15 text-destructive animate-pulse'
                          : 'bg-primary/10 text-primary',
                    )}
                  >
                    {dynamicBadge}
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
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value
                  setSearchParams((prev) => {
                    if (val) {
                      prev.set('q', val)
                    } else {
                      prev.delete('q')
                    }
                    return prev
                  })
                }}
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {portal === 'admin' && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 px-2.5 transition duration-200 hover:bg-muted/60">
            <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline-block">Year:</span>
            <select
              value={selectedYear}
              onChange={async (e) => {
                setSelectedYear(e.target.value)
                try {
                  await initializeStore()
                } catch (err) {
                  console.error('Failed to reload store on academic year change', err)
                }
              }}
              className="cursor-pointer bg-transparent text-xs font-semibold text-foreground outline-none focus:ring-0"
            >
              {yearOptions.length === 0 ? (
                <option value="" disabled className="bg-background font-semibold text-foreground">
                  No years
                </option>
              ) : (
                yearOptions.map((year) => {
                  const ayObj = academicYears.find((item) => item.academic_year === year)
                  const icon = ayObj ? statusIcon(ayObj.status) : ''
                  return (
                    <option key={year} value={year} className="bg-background font-semibold text-foreground">
                      {icon} {year}
                    </option>
                  )
                })
              )}
            </select>
          </div>
          )}

          <button
            type="button"
            onClick={handleNotificationsClick}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted cursor-pointer transition"
            aria-label="Notifications"
          >
            <Bell
              className={cn(
                'h-5 w-5 transition',
                unreadCount > 0 ? 'text-primary font-bold' : 'text-muted-foreground',
              )}
            />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-muted cursor-pointer"
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

            {profileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card p-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      clearAuthSession()
                      navigate('/login')
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-muted cursor-pointer font-semibold"
                  >
                    <LogOut className="h-4 w-4" /> Sign out / Logout
                  </button>
                </div>
              </>
            )}
          </div>
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



