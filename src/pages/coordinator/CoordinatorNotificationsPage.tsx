import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Send, Info, Check, AlertTriangle, Megaphone, Trash2, CheckCheck } from 'lucide-react'
import { getAuthSession } from '../../lib/auth'
import { getShortBranchName } from '../../lib/branchUtils'
import {
  loadPlacementNotifications,
  savePlacementNotifications,
  syncPlacementNotifications,
  useStoreState,
  type PlacementNotification
} from '../../lib/placeproStore'

interface Broadcast {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'announcement'
  branch: string
  sender: string
  createdAt: string
}

const STORAGE_KEY = 'placepro-broadcasts'

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

export function CoordinatorNotificationsPage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'
  const coordName = session?.name || 'Coordinator'
  const coordEmail = session?.email?.trim().toUpperCase() || ''

  const [activeTab, setActiveTab] = useState<'inbox' | 'broadcast'>('inbox')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])

  const liveNotifications = useStoreState(loadPlacementNotifications) ?? []
  
  // Filter inbox notifications sent to this coordinator
  const inboxNotifs = useMemo(() => {
    return liveNotifications
      .filter((n) => {
        const targetRoll = (n.rollNumber || '').trim().toUpperCase()
        return targetRoll === coordEmail || targetRoll === 'ALL'
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [liveNotifications, coordEmail])

  function toggleInboxRead(id: string) {
    const updated = liveNotifications.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    savePlacementNotifications(updated)
  }

  function markAllInboxRead() {
    const updated = liveNotifications.map((n) => {
      const targetRoll = (n.rollNumber || '').trim().toUpperCase()
      return targetRoll === coordEmail || targetRoll === 'ALL' ? { ...n, read: true } : n
    })
    savePlacementNotifications(updated)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      markAllInboxRead()
    }, 600)
    return () => clearTimeout(timer)
  }, [inboxNotifs.length])
  
  // Compose form states
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'announcement'>('info')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load broadcasts & sync placement notifications on mount
  useEffect(() => {
    syncPlacementNotifications()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setBroadcasts(JSON.parse(raw) as Broadcast[])
      } catch (e) {
        console.error('Failed to parse broadcasts:', e)
      }
    }
  }, [])

  // Filter broadcasts sent by this branch
  const deptBroadcasts = useMemo(() => {
    return broadcasts.filter((b) => b.branch === coordDept)
  }, [broadcasts, coordDept])

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return

    const newBroadcast: Broadcast = {
      id: `BRDCST-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      type,
      branch: coordDept,
      sender: coordName,
      createdAt: new Date().toISOString()
    }

    const updated = [newBroadcast, ...broadcasts]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setBroadcasts(updated)
    
    // Clear form
    setTitle('')
    setMessage('')
    setType('info')
    
    // Show success
    setSuccessMsg('Broadcast announcement sent successfully!')
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleDeleteBroadcast = (id: string) => {
    const updated = broadcasts.filter((b) => b.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setBroadcasts(updated)
  }

  const typeIcons = {
    info: Info,
    success: Check,
    warning: AlertTriangle,
    announcement: Megaphone,
  }

  const typeColors = {
    info: 'bg-info/10 text-info-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning-foreground',
    announcement: 'bg-primary/10 text-primary',
  }

  const navigate = useNavigate()

  function handleInboxClick(n: PlacementNotification) {
    if (!n.read) toggleInboxRead(n.id)
    navigate(`/coordinator/placements?q=${encodeURIComponent(n.company)}`)
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            {getShortBranchName(coordDept)} Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage bulk broadcasts to students and view incoming administration logs.
          </p>
        </div>
        {activeTab === 'inbox' && inboxNotifs.filter(n => !n.read).length > 0 && (
          <button
            type="button"
            onClick={markAllInboxRead}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer font-semibold"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border flex gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`pb-3 transition-colors relative cursor-pointer ${activeTab === 'inbox' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Inbox Notifications ({inboxNotifs.filter(n => !n.read).length} unread)
          {activeTab === 'inbox' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`pb-3 transition-colors relative cursor-pointer ${activeTab === 'broadcast' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Audience Broadcaster
          {activeTab === 'broadcast' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {activeTab === 'inbox' && (
        <div className="space-y-3">
          {inboxNotifs.map((n) => {
            const Icon = typeIcons[n.type as keyof typeof typeIcons] || Info
            const colorClass = typeColors[n.type as keyof typeof typeColors] || 'bg-info/10 text-info-foreground'

            return (
              <div
                key={n.id}
                onClick={() => handleInboxClick(n)}
                className={`card-surface flex items-start gap-4 p-5 transition-colors cursor-pointer ${
                  !n.read ? 'border-l-4 border-l-primary bg-primary/5' : 'opacity-85'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm ${!n.read ? 'font-bold' : 'font-medium'}`}>{n.company}</h3>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatTime(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{n.role}</p>
                  <div className="mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {n.type || 'Announcement'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleInboxRead(n.id)
                  }}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  title={n.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {n.read ? <Check className="h-4 w-4 text-success" /> : <Bell className="h-4 w-4" />}
                </button>
              </div>
            )
          })}
          {inboxNotifs.length === 0 && (
            <div className="card-surface flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No inbox notifications received yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Compose Form */}
          <div className="md:col-span-1 card-surface p-5 h-fit">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Send Announcement
            </h2>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {successMsg && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 font-semibold">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
                <input
                  placeholder="e.g. Urgent: Resume submission deadline"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
                <textarea
                  placeholder="Compose announcement body..."
                  value={message}
                  rows={4}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alert Level</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(['info', 'success', 'warning', 'announcement'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        type === t
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input hover:bg-muted'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
              >
                Send Broadcast
              </button>
            </form>
          </div>

          {/* Sent History */}
          <div className="md:col-span-2 card-surface p-5">
            <h2 className="text-lg font-bold mb-4">Sent Announcement History</h2>

            <div className="space-y-4">
              {deptBroadcasts.map((b) => {
                const Icon = typeIcons[b.type]
                const colorClass = typeColors[b.type]

                return (
                  <div key={b.id} className="flex gap-4 p-4 border border-border rounded-xl bg-background/50 hover:bg-background transition">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-foreground text-sm sm:text-base">{b.title}</h4>
                        <button
                          type="button"
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="text-muted-foreground hover:text-destructive transition p-1"
                          title="Delete Broadcast"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{b.message}</p>
                      <div className="mt-3 flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Sender: {b.sender}</span>
                        <span className="font-mono">{new Date(b.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {deptBroadcasts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground italic border border-dashed border-border rounded-xl">
                  No announcement broadcasts sent yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
