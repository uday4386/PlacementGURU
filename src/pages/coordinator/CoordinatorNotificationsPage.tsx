import { useState, useEffect, useMemo } from 'react'
import { Bell, Send, Info, Check, AlertTriangle, Megaphone, Trash2 } from 'lucide-react'
import { getAuthSession } from '../../lib/auth'
import { getShortBranchName } from '../../lib/branchUtils'

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

export function CoordinatorNotificationsPage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'
  const coordName = session?.name || 'Coordinator'

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  
  // Compose form states
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'announcement'>('info')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load broadcasts on mount
  useEffect(() => {
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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" />
          {getShortBranchName(coordDept)} Broadcasts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send announcements, alerts, and warnings directly to students in your department.
        </p>
      </div>

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
    </>
  )
}
