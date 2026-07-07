import { useState } from 'react'
import { Search } from 'lucide-react'

const auditLogs = [
  { id: 'AUD-001', user: 'Admin User', action: 'Created drive', target: 'Amazon SDE-1 Drive', module: 'Drives', timestamp: '2026-06-24 14:32', ip: '192.168.1.12' },
  { id: 'AUD-002', user: 'Coordinator Rao', action: 'Uploaded master data', target: 'CSE 2026 Student Master', module: 'Students', timestamp: '2026-06-24 13:15', ip: '192.168.1.45' },
  { id: 'AUD-003', user: 'Admin User', action: 'Updated eligibility', target: 'TCS CGPA criteria', module: 'Eligibility', timestamp: '2026-06-24 11:08', ip: '192.168.1.12' },
  { id: 'AUD-004', user: 'System', action: 'Generated report', target: 'Branch-wise placement analysis', module: 'Reports', timestamp: '2026-06-23 22:00', ip: 'System' },
  { id: 'AUD-005', user: 'Admin User', action: 'Marked placed', target: '12 students at Infosys', module: 'Placements', timestamp: '2026-06-23 16:45', ip: '192.168.1.12' },
  { id: 'AUD-006', user: 'Admin User', action: 'Created form', target: 'Student Feedback Survey', module: 'Forms', timestamp: '2026-06-23 10:20', ip: '192.168.1.12' },
  { id: 'AUD-007', user: 'Coordinator Joshi', action: 'Updated student status', target: 'Vikram Singh → Registered', module: 'Students', timestamp: '2026-06-22 15:30', ip: '192.168.1.78' },
  { id: 'AUD-008', user: 'Admin User', action: 'Added company', target: 'Google', module: 'Companies', timestamp: '2026-06-22 09:12', ip: '192.168.1.12' },
  { id: 'AUD-009', user: 'System', action: 'Sent notification', target: 'Placement orientation reminder', module: 'Notifications', timestamp: '2026-06-21 08:00', ip: 'System' },
  { id: 'AUD-010', user: 'Admin User', action: 'Updated settings', target: 'Email notification preferences', module: 'Settings', timestamp: '2026-06-20 14:55', ip: '192.168.1.12' },
]

const moduleColors: Record<string, string> = {
  Drives: 'bg-primary/10 text-primary',
  Students: 'bg-info/15 text-info-foreground',
  Eligibility: 'bg-warning/15 text-warning-foreground',
  Reports: 'bg-success/10 text-success',
  Placements: 'bg-success/10 text-success',
  Forms: 'bg-primary/10 text-primary',
  Companies: 'bg-info/15 text-info-foreground',
  Notifications: 'bg-warning/15 text-warning-foreground',
  Settings: 'bg-muted text-muted-foreground',
}

export function AdminAuditPage() {
  const [search, setSearch] = useState('')

  const filtered = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all administrative actions across the platform.
        </p>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search logs by user, action, or target…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Target</th>
                <th className="px-5 py-3 font-medium">Module</th>
                <th className="px-5 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{log.timestamp}</td>
                  <td className="px-5 py-3 font-medium">{log.user}</td>
                  <td className="px-5 py-3">{log.action}</td>
                  <td className="px-5 py-3 text-muted-foreground">{log.target}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${moduleColors[log.module] ?? ''}`}>
                      {log.module}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {auditLogs.length} log entries
      </div>
    </>
  )
}
