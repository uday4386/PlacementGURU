import { useCallback, useEffect, useState } from 'react'
import {
  Archive,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Plus,
  Trash2,
  Users,
  Building2,
  Briefcase,
  X,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { refreshStore } from '../../lib/placeproStore'
import { getAuthToken } from '../../lib/auth'
import { useAcademicYear, type AcademicYear } from '../../lib/AcademicYearContext'

interface YearStats {
  students: number
  companies: number
  placements: number
}

export function AdminAcademicYearsPage() {
  const { refetchYears: refetchContext } = useAcademicYear()
  const [years, setYears] = useState<AcademicYear[]>([])
  const [stats, setStats] = useState<Record<string, YearStats>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [formData, setFormData] = useState({ academic_year: '', start_date: '', end_date: '', status: 'UPCOMING' as string })
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const token = getAuthToken()

  const fetchYears = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/academic-years')
      if (res.ok) {
        const data: AcademicYear[] = await res.json()
        setYears(data)

        // Fetch stats for each year
        const statsMap: Record<string, YearStats> = {}
        await Promise.all(
          data.map(async (y) => {
            try {
              const sRes = await fetch(`/api/dashboard/stats?year=${y.academic_year}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (sRes.ok) {
                const s = await sRes.json()
                statsMap[y.academic_year] = {
                  students: s.totalStudents || 0,
                  companies: s.totalCompanies || 0,
                  placements: s.totalPlaced || 0,
                }
              }
            } catch {}
          })
        )
        setStats(statsMap)
      }
    } catch (err) {
      console.error('Failed to fetch academic years:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchYears()
  }, [fetchYears])

  const openCreateModal = () => {
    setEditingYear(null)
    const now = new Date()
    const nextStart = now.getFullYear()
    setFormData({
      academic_year: `${nextStart}-${nextStart + 1}`,
      start_date: `${nextStart}-06-01`,
      end_date: `${nextStart + 1}-05-31`,
      status: 'UPCOMING',
    })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (y: AcademicYear) => {
    setEditingYear(y)
    setFormData({
      academic_year: y.academic_year,
      start_date: y.start_date,
      end_date: y.end_date,
      status: y.status,
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.academic_year || !/^\d{4}-\d{4}$/.test(formData.academic_year)) {
      setError('Academic year must be in format YYYY-YYYY (e.g., 2027-2028)')
      return
    }

    try {
      setActionLoading(-1)
      const url = editingYear ? `/api/academic-years/${editingYear.id}` : '/api/academic-years'
      const method = editingYear ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowModal(false)
        await fetchYears()
        await refetchContext()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivate = async (y: AcademicYear) => {
    if (!confirm(`Activate ${y.academic_year}? This will archive the current active year.`)) return
    try {
      setActionLoading(y.id)
      await fetch(`/api/academic-years/${y.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...y, status: 'ACTIVE' }),
      })
      await fetchYears()
      await refetchContext()
    } catch (err) {
      alert('Failed to activate academic year')
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async (y: AcademicYear) => {
    if (!confirm(`Archive ${y.academic_year}?`)) return
    try {
      setActionLoading(y.id)
      await fetch(`/api/academic-years/${y.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...y, status: 'ARCHIVED' }),
      })
      await fetchYears()
      await refetchContext()
    } catch (err) {
      alert('Failed to archive academic year')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (y: AcademicYear) => {
    if (!confirm(`Delete ${y.academic_year}? This can only succeed if no data exists for this year.`)) return
    try {
      setActionLoading(y.id)
      const res = await fetch(`/api/academic-years/${y.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await fetchYears()
        await refetchContext()
        await refreshStore()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
      }
    } catch (err) {
      alert('Failed to delete academic year')
    } finally {
      setActionLoading(null)
    }
  }

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Active' },
    ARCHIVED: { color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: <Archive className="h-4 w-4" />, label: 'Archived' },
    UPCOMING: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <Clock className="h-4 w-4" />, label: 'Upcoming' },
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Academic Year Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, manage, and configure academic years for the placement portal
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Create Academic Year
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {years.map((y) => {
            const sc = statusConfig[y.status] || statusConfig.UPCOMING
            const s = stats[y.academic_year] || { students: 0, companies: 0, placements: 0 }
            const isProcessing = actionLoading === y.id

            return (
              <div
                key={y.id}
                className={`card-surface overflow-hidden transition-all duration-300 hover:shadow-lg ${y.status === 'ACTIVE' ? 'ring-2 ring-emerald-400/40' : ''}`}
              >
                {/* Status ribbon */}
                <div className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border-b ${sc.bg} ${sc.color}`}>
                  {sc.icon}
                  {sc.label}
                  {y.status === 'ACTIVE' && <Zap className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      {y.academic_year}
                    </h3>
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">
                    {y.start_date && y.end_date ? `${y.start_date} → ${y.end_date}` : 'No dates configured'}
                  </div>

                  {/* Stats mini-cards */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg bg-blue-50 p-2.5 text-center">
                      <Users className="mx-auto mb-1 h-4 w-4 text-blue-500" />
                      <div className="text-lg font-bold text-blue-700">{s.students}</div>
                      <div className="text-[10px] text-blue-500 font-medium">Students</div>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-2.5 text-center">
                      <Building2 className="mx-auto mb-1 h-4 w-4 text-purple-500" />
                      <div className="text-lg font-bold text-purple-700">{s.companies}</div>
                      <div className="text-[10px] text-purple-500 font-medium">Companies</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2.5 text-center">
                      <Briefcase className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
                      <div className="text-lg font-bold text-emerald-700">{s.placements}</div>
                      <div className="text-[10px] text-emerald-500 font-medium">Placements</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => openEditModal(y)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition disabled:opacity-40"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                    {y.status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleActivate(y)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 transition disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Activate
                      </button>
                    )}
                    {y.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleArchive(y)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 transition disabled:opacity-40"
                      >
                        <Archive className="h-3 w-3" /> Archive
                      </button>
                    )}
                    {y.status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleDelete(y)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    )}
                    {isProcessing && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent ml-auto self-center" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card-surface w-full max-w-md p-6 mx-4 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">
                {editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Academic Year</label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  placeholder="e.g., 2027-2028"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                >
                  <option value="UPCOMING">🔜 Upcoming</option>
                  <option value="ACTIVE">🟢 Active</option>
                  <option value="ARCHIVED">📦 Archived</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === -1}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {actionLoading === -1 ? 'Saving...' : editingYear ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
