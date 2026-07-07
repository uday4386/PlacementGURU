import { useState } from 'react'
import { Bell, Check, CheckCheck, Info, AlertTriangle, Megaphone, Send, Globe } from 'lucide-react'

type NotificationType = 'info' | 'success' | 'warning' | 'announcement'

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  time: string
  read: boolean
}

const initialNotifications: Notification[] = [
  { id: '1', title: 'Amazon drive shortlist released', message: '28 students have been shortlisted for the Amazon SDE-1 drive. Round 2 starts July 28.', type: 'info', time: '2 hours ago', read: false },
  { id: '2', title: 'CSE master data uploaded', message: 'Coordinator Rao uploaded the student master sheet for CSE 2026 batch. 312 records processed.', type: 'success', time: '4 hours ago', read: false },
  { id: '3', title: '12 pending registrations', message: '12 students from ME department have incomplete registrations. Deadline is July 31.', type: 'warning', time: '1 day ago', read: false },
  { id: '4', title: 'New company: Google added', message: 'Google has been added to the recruiting companies list. Drive scheduled for August 2026.', type: 'info', time: '2 days ago', read: true },
  { id: '5', title: 'Placement orientation announcement', message: 'Placement orientation scheduled for July 15 at Main Auditorium. All 2026 batch students invited.', type: 'announcement', time: '3 days ago', read: true },
  { id: '6', title: 'Report generated: Branch-wise analysis', message: 'The branch-wise placement analysis report has been generated and is ready for download.', type: 'success', time: '3 days ago', read: true },
  { id: '7', title: 'TCS eligibility criteria updated', message: 'Minimum CGPA for TCS changed from 6.0 to 6.5. 98 students are now ineligible.', type: 'warning', time: '5 days ago', read: true },
]

const typeIcons: Record<NotificationType, typeof Bell> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  announcement: Megaphone,
}

const typeColors: Record<NotificationType, string> = {
  info: 'bg-info/15 text-info-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning-foreground',
  announcement: 'bg-primary/10 text-primary',
}

export function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [activeTab, setActiveTab] = useState<'inbox' | 'broadcast'>('inbox')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Broadcaster states
  const [notifType, setNotifType] = useState('Registration Open')
  const [audience, setAudience] = useState('All Students')
  const [targetBranch, setTargetBranch] = useState('CSE')
  const [targetDept, setTargetDept] = useState('Computer Science')
  const [eligibilityGroup, setEligibilityGroup] = useState('CGPA >= 8.0')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length
  const displayed = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    showToast('All messages marked as read.')
  }

  function toggleRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    )
  }

  function handleBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!subject || !message) return

    setSending(true)

    let targetSummary = audience
    if (audience === 'Specific Branch') targetSummary = `Branch: ${targetBranch}`
    else if (audience === 'Specific Department') targetSummary = `Department: ${targetDept}`
    else if (audience === 'Specific Eligibility Group') targetSummary = `Group: ${eligibilityGroup}`

    let simulatedCount = 1540
    if (targetBranch === 'CSE') simulatedCount = 312
    else if (targetBranch === 'ECE') simulatedCount = 240
    else if (targetBranch === 'IT') simulatedCount = 180

    setTimeout(() => {
      // Append to local notifications inbox history
      const newNotif: Notification = {
        id: `NOTIF-${notifications.length + 1}`,
        title: subject,
        message: `${message} (Targeted to: ${targetSummary})`,
        type: notifType.includes('Open') ? 'info' : notifType.includes('Closing') ? 'warning' : 'announcement',
        time: 'Just now',
        read: false,
      }

      setNotifications([newNotif, ...notifications])
      setSending(false)
      setSubject('')
      setMessage('')
      setActiveTab('inbox')
      showToast(`Bulk email sent successfully to all ${simulatedCount} members of ${targetSummary}!`)
    }, 1200)
  }

  return (
    <>
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-pop animate-in fade-in duration-300">
          {toastMessage}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcaster for bulk notifications, student email updates, and coordinator logs.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'inbox' && (
            <>
              <button
                type="button"
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted cursor-pointer"
              >
                <Bell className="h-4 w-4" /> {filter === 'all' ? 'Show unread' : 'Show all'}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer"
                >
                  <CheckCheck className="h-4 w-4" /> Mark all read
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border flex gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`pb-3 transition-colors relative ${activeTab === 'inbox' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Inbox Log
          {activeTab === 'inbox' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`pb-3 transition-colors relative ${activeTab === 'broadcast' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Audience Broadcaster
          {activeTab === 'broadcast' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {activeTab === 'inbox' && (
        <div className="space-y-3">
          {displayed.map((n) => {
            const Icon = typeIcons[n.type]
            return (
              <div
                key={n.id}
                className={`card-surface flex items-start gap-4 p-5 transition-colors ${
                  !n.read ? 'border-l-4 border-l-primary' : ''
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${typeColors[n.type]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm ${!n.read ? 'font-bold' : 'font-medium'}`}>{n.title}</h3>
                    <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleRead(n.id)}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  title={n.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {n.read ? <Bell className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </button>
              </div>
            )
          })}
          {displayed.length === 0 && (
            <div className="card-surface flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No unread notifications</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="card-surface p-5 md:p-6 md:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-1.5"><Send className="h-4 w-4 text-primary" /> Audience Broadcaster</h2>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Notification Type</label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  >
                    <option value="Registration Open">Registration Open</option>
                    <option value="Registration Closing">Registration Closing</option>
                    <option value="Placement Updates">Placement Updates</option>
                    <option value="Custom Messages">Custom Messages</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Target Audience Group</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  >
                    <option value="All Students">All Students</option>
                    <option value="Specific Branch">Specific Branch</option>
                    <option value="Specific Department">Specific Department</option>
                    <option value="Specific Eligibility Group">Specific Eligibility Group</option>
                  </select>
                </div>
              </div>

              {/* Specific Branch Select */}
              {audience === 'Specific Branch' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Select Branch</label>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
                  >
                    <option value="CSE">Computer Science (CSE)</option>
                    <option value="ECE">Electronics (ECE)</option>
                    <option value="IT">Information Tech (IT)</option>
                    <option value="ME">Mechanical (ME)</option>
                    <option value="EE">Electrical (EE)</option>
                    <option value="CE">Civil (CE)</option>
                  </select>
                </div>
              )}

              {/* Specific Department Select */}
              {audience === 'Specific Department' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Select Department</label>
                  <select
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
                  >
                    <option value="Computer Science">Computer Science & Engineering</option>
                    <option value="Electronics">Electronics & Comm Engineering</option>
                    <option value="Mechanical">Mechanical Engineering</option>
                    <option value="Electrical">Electrical & Electronics Engineering</option>
                  </select>
                </div>
              )}

              {/* Specific Eligibility Select */}
              {audience === 'Specific Eligibility Group' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Eligibility Filter Rule</label>
                  <select
                    value={eligibilityGroup}
                    onChange={(e) => setEligibilityGroup(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
                  >
                    <option value="CGPA >= 8.0">CGPA &gt;= 8.0 (Product Tier)</option>
                    <option value="CGPA >= 7.0">CGPA &gt;= 7.0 (Mid Tier)</option>
                    <option value="Backlogs = 0">Zero Active Backlogs</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Email Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TCS Ninja Drive registration is closing soon"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Message Body</label>
                <textarea
                  required
                  placeholder="Type email body details here…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 h-28 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <button
                type="submit"
                className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer font-bold"
              >
                <Send className="h-4 w-4" /> {sending ? 'Broadcasting Bulk Emails…' : 'Send Broadcast Email'}
              </button>
            </form>
          </div>

          {/* Guidelines Sidebar */}
          <div className="card-surface p-5 md:p-6 space-y-4 h-fit">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Globe className="h-4 w-4" /> Broadcast Guidelines</h3>
            <ul className="text-xs text-muted-foreground space-y-3 leading-relaxed">
              <li className="flex gap-2">
                <Check className="h-4 w-4 text-success shrink-0" />
                <span>Sends automated bulk emails to all students matching the target segment filter rules.</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 text-success shrink-0" />
                <span>Simulates real-time college SMTP gateway transmissions. Logs will immediately reflect in the inbox audit logs.</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 text-success shrink-0" />
                <span>Segment calculations are adjusted dynamically when specific branches (e.g. CSE achieved 312 matches) are toggled.</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
