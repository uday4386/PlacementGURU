import { useState, useMemo } from 'react'
import { Bell, Check, MailOpen, Award, Sparkles } from 'lucide-react'
import { studentNotifications } from '../../data/platformData'
import { getAuthSession } from '../../lib/auth'
import {
  loadPlacementNotifications,
  savePlacementNotifications,
  loadMasterRows,
  useStoreState,
  type PlacementNotification,
} from '../../lib/placeproStore'
import { matchesBranch, getShortBranchName } from '../../lib/branchUtils'


function formatTime(isoString: string) {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

export function StudentNotificationsPage() {
  const session = getAuthSession()
  const rollNumber = session?.rollNumber?.trim().toUpperCase() || ''

  // Local state for static notifications
  const [staticNotifs, setStaticNotifs] = useState(studentNotifications)

  // Local state for placement notifications
  const [placementNotifs, setPlacementNotifs] = useState<PlacementNotification[]>(() => {
    const all = loadPlacementNotifications()
    return all.filter((n) => n.rollNumber === rollNumber)
  })

  const masterRows = useStoreState(loadMasterRows) ?? []
  
  // Find current student's branch
  const studentBranch = useMemo(() => {
    const studentProfile = masterRows.find(
      (s) => s.rollNumber.trim().toUpperCase() === rollNumber
    )
    return studentProfile?.branch || ''
  }, [masterRows, rollNumber])

  // Local state for department broadcasts
  const [broadcasts] = useState<any[]>(() => {
    const raw = localStorage.getItem('placepro-broadcasts')
    if (!raw) return []
    try {
      return JSON.parse(raw) as any[]
    } catch {
      return []
    }
  })

  // Read broadcasts state
  const [readBroadcastIds, setReadBroadcastIds] = useState<string[]>(() => {
    const raw = localStorage.getItem('placepro-read-broadcasts')
    if (!raw) return []
    try {
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  })

  // Filter broadcasts matching student's branch
  const deptBroadcasts = useMemo(() => {
    return broadcasts.filter((b) => matchesBranch(studentBranch, b.branch))
  }, [broadcasts, studentBranch])

  function toggleBroadcastRead(id: string) {
    const updated = readBroadcastIds.includes(id)
      ? readBroadcastIds.filter((x) => x !== id)
      : [...readBroadcastIds, id]
    localStorage.setItem('placepro-read-broadcasts', JSON.stringify(updated))
    setReadBroadcastIds(updated)
  }


  // Helper to persist read status changes
  function togglePlacementRead(id: string) {
    const all = loadPlacementNotifications()
    const updated = all.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    savePlacementNotifications(updated)
    setPlacementNotifs(updated.filter((n) => n.rollNumber === rollNumber))
  }

  function toggleStaticRead(id: number) {
    setStaticNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    )
  }

  function markAllRead() {
    setStaticNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    const all = loadPlacementNotifications()
    const updated = all.map((n) => (n.rollNumber === rollNumber ? { ...n, read: true } : n))
    savePlacementNotifications(updated)
    setPlacementNotifs(updated.filter((n) => n.rollNumber === rollNumber))
    
    // Mark all broadcasts as read
    const allBroadcastIds = deptBroadcasts.map((b) => b.id)
    localStorage.setItem('placepro-read-broadcasts', JSON.stringify(allBroadcastIds))
    setReadBroadcastIds(allBroadcastIds)
  }

  const unreadCount =
    staticNotifs.filter((n) => !n.read).length +
    placementNotifs.filter((n) => !n.read).length +
    deptBroadcasts.filter((b) => !readBroadcastIds.includes(b.id)).length

  // Merge notifications for display
  const displayList = useMemo(() => {
    const mappedPlacement = placementNotifs.map((n) => ({
      id: n.id,
      title: `🎉 Congratulations! Selected at ${n.company}`,
      desc: `You have been selected as ${n.role} with package ${n.package} (${n.type})!`,
      time: formatTime(n.createdAt),
      category: 'Placement Selection',
      read: n.read,
      isPlacement: true,
      isBroadcast: false,
      original: n,
    }))

    const mappedStatic = staticNotifs.map((n) => ({
      id: String(n.id),
      title: n.title,
      desc: n.desc,
      time: n.time,
      category: n.category,
      read: n.read,
      isPlacement: false,
      isBroadcast: false,
      original: null,
    }))

    const mappedBroadcasts = deptBroadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      desc: b.message,
      time: formatTime(b.createdAt),
      category: `${b.sender} (${getShortBranchName(b.branch)})`,
      read: readBroadcastIds.includes(b.id),
      isPlacement: false,
      isBroadcast: true,
      original: b,
    }))

    // Show placement selections first, then broadcasts, then static
    return [...mappedPlacement, ...mappedBroadcasts, ...mappedStatic]
  }, [placementNotifs, staticNotifs, deptBroadcasts, readBroadcastIds])

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay updated on selection announcements, shortlists, action items, and drive alerts.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted transition cursor-pointer"
          >
            <Check className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="card-surface divide-y divide-border overflow-hidden p-0">
        {displayList.map((notif) => {
          const isPlacement = notif.isPlacement
          return (
            <div
              key={notif.id}
              className={`flex gap-4 p-5 transition hover:bg-muted/30 relative ${
                isPlacement && !notif.read
                  ? 'bg-success/5 border-l-4 border-success'
                  : !isPlacement && !notif.read
                    ? 'bg-primary/5'
                    : 'opacity-85'
              }`}
            >
              {isPlacement && !notif.read && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-success uppercase tracking-wider animate-pulse">
                  <Sparkles className="h-3 w-3" /> Offer Received
                </div>
              )}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isPlacement
                    ? 'bg-success/10 text-success'
                    : notif.read
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/10 text-primary'
                }`}
              >
                {isPlacement ? (
                  <Award className="h-5 w-5" />
                ) : notif.read ? (
                  <MailOpen className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold text-foreground sm:text-base">
                    {notif.title}
                    {!notif.read && (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isPlacement ? 'bg-success' : 'bg-primary'
                        }`}
                      />
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{notif.time}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {notif.desc}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isPlacement
                        ? 'bg-success/20 text-success-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {notif.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isPlacement) {
                        togglePlacementRead(notif.id)
                      } else if (notif.isBroadcast) {
                        toggleBroadcastRead(notif.id)
                      } else {
                        toggleStaticRead(Number(notif.id))
                      }
                    }}
                    className={`text-xs font-semibold hover:underline cursor-pointer ${
                      isPlacement ? 'text-success' : 'text-primary'
                    }`}
                  >
                    Mark as {notif.read ? 'unread' : 'read'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {displayList.length === 0 && (
          <div className="p-8 text-center text-muted-foreground italic">
            You have no notifications at the moment.
          </div>
        )}
      </div>
    </>
  )
}
