import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Lock,
  Mail,
  Plus,
  Save,
  Shield,
  Trash2,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { getAuthToken, getAuthSession, clearAuthSession } from '../../lib/auth'
import { getShortBranchName, getAllBranchOptions } from '../../lib/branchUtils'
import { initializeStore, loadMasterRows, useStoreState, wipeAllData } from '../../lib/placeproStore'
import { useAcademicYear, type AcademicYear } from '../../lib/AcademicYearContext'

interface YearStats {
  students: number
  companies: number
  placements: number
}

export function AdminSettingsPage() {
  const session = getAuthSession()
  const { selectedYear: activeSelectedYear, setSelectedYear, refetchYears: refetchYearContext } = useAcademicYear()
  const [saved, setSaved] = useState(false)

  const [years, setYears] = useState<AcademicYear[]>([])
  const currentYearObj = useMemo(() => {
    return years.find((y) => y.academic_year === activeSelectedYear)
  }, [years, activeSelectedYear])

  const [collegeName, setCollegeName] = useState('')
  const [university, setUniversity] = useState('')
  const [collegeLocation, setCollegeLocation] = useState('')
  const [collegeWebsite, setCollegeWebsite] = useState('')
  const [isSavingCollege, setIsSavingCollege] = useState(false)

  useEffect(() => {
    if (currentYearObj) {
      setCollegeName(currentYearObj.college_name || '')
      setUniversity(currentYearObj.university || '')
      setCollegeLocation(currentYearObj.college_location || '')
      setCollegeWebsite(currentYearObj.college_website || '')
    }
  }, [currentYearObj])

  async function handleSaveCollegeInfo() {
    if (!currentYearObj) return
    setIsSavingCollege(true)
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/academic-years/${currentYearObj.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...currentYearObj,
          college_name: collegeName,
          university,
          college_location: collegeLocation,
          college_website: collegeWebsite
        })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        await fetchAcademicYears()
        await refetchYearContext()
      }
    } catch (err) {
      console.error('Failed to save college info:', err)
    } finally {
      setIsSavingCollege(false)
    }
  }
  const [archives, setArchives] = useState<any[]>([])
  const [archiveYear, setArchiveYear] = useState('2026-2027')
  const [isArchiving, setIsArchiving] = useState(false)
  const [isLoadingArchives, setIsLoadingArchives] = useState(true)
  void archives; void isArchiving; void isLoadingArchives
  const [wipeConfirmYear, setWipeConfirmYear] = useState<string | null>(null)
  const [isDeletingArchive, setIsDeletingArchive] = useState(false)
  const [yearStats, setYearStats] = useState<Record<string, YearStats>>({})
  const [isLoadingYears, setIsLoadingYears] = useState(true)
  const [showYearModal, setShowYearModal] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [yearError, setYearError] = useState('')
  const [yearActionLoading, setYearActionLoading] = useState<number | null>(null)
  const [yearForm, setYearForm] = useState({
    academic_year: '',
    start_date: '',
    end_date: '',
    status: 'UPCOMING',
    college_name: '',
    university: '',
    college_location: '',
    college_website: '',
  })

  const [coordinators, setCoordinators] = useState<any[]>([])
  const [isLoadingCoords, setIsLoadingCoords] = useState(true)
  const [coordName, setCoordName] = useState('')
  const [coordEmail, setCoordEmail] = useState('')
  const [coordPassword, setCoordPassword] = useState('')
  const [coordBranch, setCoordBranch] = useState('Computer Science Engineering')
  const [editingCoordEmail, setEditingCoordEmail] = useState<string | null>(null)
  const [showCustomBranch, setShowCustomBranch] = useState(false)
  const [customBranchName, setCustomBranchName] = useState('')

  const [resetRollNumbers, setResetRollNumbers] = useState('')
  const [isResetting2FA, setIsResetting2FA] = useState(false)

  const masterRows = useStoreState(loadMasterRows) ?? []

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [adminNewEmail, setAdminNewEmail] = useState(session?.email || '')
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('')
  const [adminNewPassword, setAdminNewPassword] = useState('')
  const [isAdminPasswordSaving, setIsAdminPasswordSaving] = useState(false)

  async function handleChangeAdminPassword() {
    if (!adminCurrentPassword) {
      alert('Please fill in your current password to save changes.')
      return
    }
    setIsAdminPasswordSaving(true)
    try {
      const token = getAuthToken()
      const res = await fetch('/api/auth/admin-change-credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          currentPassword: adminCurrentPassword, 
          newPassword: adminNewPassword || undefined,
          newEmail: adminNewEmail || undefined
        })
      })
      const data = await res.json()
      if (res.ok) {
        if (adminNewEmail && adminNewEmail !== session?.email) {
          alert('Credentials updated successfully. Please log in again with your new email.')
          clearAuthSession()
          window.location.href = '/'
          return
        }
        alert('Credentials updated successfully.')
        setAdminCurrentPassword('')
        setAdminNewPassword('')
        setIsChangingPassword(false)
      } else {
        alert(data.error || 'Failed to change credentials.')
      }
    } catch (err: any) {
      alert(`Error changing credentials: ${err.message}`)
    } finally {
      setIsAdminPasswordSaving(false)
    }
  }

  // Dynamically build branch options from defaults + master data + existing coordinators
  const branchOptions = useMemo(() => {
    const masterBranches = masterRows.map((r) => r.branch)
    const coordBranches = coordinators.map((c: any) => c.department || '')
    return getAllBranchOptions([...masterBranches, ...coordBranches])
  }, [masterRows, coordinators])

  useEffect(() => {
    fetchAcademicYears()
    fetchArchives()
    fetchCoordinators()
  }, [])

  async function fetchAcademicYears() {
    setIsLoadingYears(true)
    try {
      const token = getAuthToken()
      const res = await fetch('/api/academic-years')
      if (!res.ok) return
      const data: AcademicYear[] = await res.json()
      setYears(data)
      if (data.length > 0 && !data.some((year) => year.academic_year === archiveYear)) {
        setArchiveYear(data[0].academic_year)
      }

      const statsMap: Record<string, YearStats> = {}
      await Promise.all(
        data.map(async (year) => {
          try {
            const statsRes = await fetch(`/api/dashboard/stats?year=${year.academic_year}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (!statsRes.ok) return
            const stats = await statsRes.json()
            statsMap[year.academic_year] = {
              students: stats.totalStudents || 0,
              companies: stats.totalCompanies || 0,
              placements: stats.totalPlaced || 0,
            }
          } catch {}
        }),
      )
      setYearStats(statsMap)
    } catch (err) {
      console.error('Error fetching academic years', err)
    } finally {
      setIsLoadingYears(false)
    }
  }

  function openCreateYearModal() {
    const now = new Date()
    const startYear = now.getFullYear()
    setEditingYear(null)
    const activeYearObj = years.find(y => y.status === 'ACTIVE') ?? years.find(y => y.college_name) ?? years[0]
    setYearForm({
      academic_year: `${startYear}-${startYear + 1}`,
      start_date: `${startYear}-06-01`,
      end_date: `${startYear + 1}-05-31`,
      status: 'UPCOMING',
      college_name: activeYearObj?.college_name || '',
      university: activeYearObj?.university || '',
      college_location: activeYearObj?.college_location || '',
      college_website: activeYearObj?.college_website || '',
    })
    setYearError('')
    setShowYearModal(true)
  }

  function openEditYearModal(year: AcademicYear) {
    setEditingYear(year)
    setYearForm({
      academic_year: year.academic_year,
      start_date: year.start_date || '',
      end_date: year.end_date || '',
      status: year.status,
      college_name: year.college_name || '',
      university: year.university || '',
      college_location: year.college_location || '',
      college_website: year.college_website || '',
    })
    setYearError('')
    setShowYearModal(true)
  }

  async function handleSaveAcademicYear() {
    if (!/^\d{4}-\d{4}$/.test(yearForm.academic_year)) {
      setYearError('Academic year must use YYYY-YYYY format, for example 2027-2028.')
      return
    }
    if (!yearForm.college_name.trim() || !yearForm.university.trim() || !yearForm.college_location.trim()) {
      setYearError('College name, university, and location are required.')
      return
    }

    try {
      setYearActionLoading(-1)
      const token = getAuthToken()
      const url = editingYear ? `/api/academic-years/${editingYear.id}` : '/api/academic-years'
      const method = editingYear ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(yearForm),
      })
      if (!res.ok) {
        const data = await res.json()
        setYearError(data.error || 'Failed to save academic year.')
        return
      }

      setShowYearModal(false)
      await fetchAcademicYears()
      await refetchYearContext()
    } catch (err: any) {
      setYearError(err.message)
    } finally {
      setYearActionLoading(null)
    }
  }

  async function updateAcademicYearStatus(year: AcademicYear, status: AcademicYear['status']) {
    if (status === 'ACTIVE' && !confirm(`Activate ${year.academic_year}? The current active year will be archived.`)) return
    try {
      setYearActionLoading(year.id)
      const token = getAuthToken()
      await fetch(`/api/academic-years/${year.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...year, status }),
      })
      await fetchAcademicYears()
      await refetchYearContext()
    } finally {
      setYearActionLoading(null)
    }
  }

  async function handleDeleteAcademicYear(year: AcademicYear) {
    if (!confirm(`Delete ${year.academic_year} and only that year's students, placements, companies, forms, submissions, and notifications?`)) return
    try {
      setYearActionLoading(year.id)
      const token = getAuthToken()
      const res = await fetch(`/api/academic-years/${year.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete academic year.')
        return
      }

      const remainingYears = years.filter((item) => item.id !== year.id)
      if (activeSelectedYear === year.academic_year && remainingYears.length > 0) {
        const nextYear = remainingYears.find((item) => item.status === 'ACTIVE') ?? remainingYears[0]
        setSelectedYear(nextYear.academic_year)
        await initializeStore()
      }
      await fetchAcademicYears()
      await refetchYearContext()
    } finally {
      setYearActionLoading(null)
    }
  }

  async function fetchCoordinators() {
    setIsLoadingCoords(true)
    try {
      const token = getAuthToken()
      const res = await fetch('/api/admin/coordinators', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCoordinators(data)
      }
    } catch (err) {
      console.error('Error fetching coordinators', err)
    } finally {
      setIsLoadingCoords(false)
    }
  }

  async function handleCoordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!coordEmail || !coordName || !coordBranch) return

    try {
      const token = getAuthToken()
      const res = await fetch('/api/admin/coordinators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: coordEmail,
          name: coordName,
          department: coordBranch,
          password: coordPassword,
          isEdit: !!editingCoordEmail
        })
      })

      if (res.ok) {
        alert(editingCoordEmail ? 'Coordinator updated successfully!' : 'Coordinator created successfully!')
        setCoordName('')
        setCoordEmail('')
        setCoordPassword('')
        setCoordBranch('Computer Science Engineering')
        setEditingCoordEmail(null)
        fetchCoordinators()
      } else {
        const data = await res.json()
        alert(`Failed to save coordinator: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Error saving coordinator: ${err.message}`)
    }
  }

  async function handleDeleteCoord(username: string) {
    if (!confirm(`Are you sure you want to delete coordinator login for "${username}"?`)) return
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/admin/coordinators/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchCoordinators()
      } else {
        const data = await res.json()
        alert(`Failed to delete: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Error deleting coordinator: ${err.message}`)
    }
  }

  async function handleReset2FA(e: React.FormEvent) {
    e.preventDefault()
    if (!resetRollNumbers.trim()) return

    const rolls = resetRollNumbers.split(/[,\n]+/).map(r => r.trim()).filter(Boolean)
    if (rolls.length === 0) return

    if (!confirm(`Are you sure you want to reset 2FA for ${rolls.length} student(s)?`)) return

    setIsResetting2FA(true)
    try {
      const token = getAuthToken()
      const res = await fetch('/api/admin/reset-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rollNumbers: rolls })
      })

      if (res.ok) {
        alert(`Successfully reset 2FA for ${rolls.length} student(s).`)
        setResetRollNumbers('')
      } else {
        const data = await res.json()
        alert(`Failed to reset 2FA: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Error resetting 2FA: ${err.message}`)
    } finally {
      setIsResetting2FA(false)
    }
  }

  function handleEditCoord(coord: any) {
    setEditingCoordEmail(coord.username)
    setCoordName(coord.name)
    setCoordEmail(coord.username)
    setCoordBranch(coord.associated_id)
    setCoordPassword('')
  }

  async function fetchArchives() {
    setIsLoadingArchives(true)
    try {
      const token = getAuthToken()
      const res = await fetch('/api/admin/archives', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setArchives(data)
      }
    } catch (err) {
      console.error('Error fetching archives', err)
    } finally {
      setIsLoadingArchives(false)
    }
  }

  async function _handleCreateArchive() {
    setIsArchiving(true)
    try {
      const token = getAuthToken()
      const res = await fetch('/api/admin/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ academicYear: archiveYear })
      })

      if (res.ok) {
        alert(`Successfully archived academic year ${archiveYear} on the backend!`)
        fetchArchives()
      } else {
        const data = await res.json()
        alert(`Failed to archive: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Error creating archive: ${err.message}`)
    } finally {
      setIsArchiving(false)
    }
  }

  async function _handleDownloadArchive(year: string) {
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/admin/archives/${year}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) {
        throw new Error('Failed to download archive file.')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `placepro-archive-${year}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      // After successful download, ask if user wants to wipe the data
      setWipeConfirmYear(year)
    } catch (err: any) {
      alert(`Error downloading archive: ${err.message}`)
    }
  }
  void _handleCreateArchive
  void _handleDownloadArchive

  async function handleWipeArchive(year: string) {
    setIsDeletingArchive(true)
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/admin/archives/${year}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        // Wipe all live data from server + client store
        await wipeAllData()
        setArchives((prev) => prev.filter((a) => a.academicYear !== year))
        alert(`Academic year ${year} data has been permanently deleted from the database. All students, placements, companies, forms, and notifications have been wiped.`)
      } else {
        const data = await res.json()
        alert(`Failed to delete: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Error deleting archive: ${err.message}`)
    } finally {
      setIsDeletingArchive(false)
      setWipeConfirmYear(null)
    }
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure platform preferences and administration options.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* College Info */}
          <div className="card-surface p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">College Information</h3>
                <p className="text-xs text-muted-foreground">Basic institutional details ({activeSelectedYear})</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">College name</label>
                <input
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">University</label>
                <input
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <input
                  value={collegeLocation}
                  onChange={(e) => setCollegeLocation(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Website</label>
                <input
                  value={collegeWebsite}
                  onChange={(e) => setCollegeWebsite(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleSaveCollegeInfo}
                disabled={isSavingCollege || !currentYearObj}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
              >
                <Save className="h-4 w-4" /> 
                {isSavingCollege ? 'Saving...' : saved ? 'Saved!' : 'Save College Information'}
              </button>
            </div>
          </div>



          {/* Academic Year Management */}
          <div className="card-surface p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Academic Year Management</h3>
                  <p className="text-xs text-muted-foreground">
                    Create years with college details and delete only that year's data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openCreateYearModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
              >
                <Plus className="h-4 w-4" /> Create Year
              </button>
            </div>

            {isLoadingYears ? (
              <div className="flex h-28 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : years.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No academic years configured yet.
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {years.map((year) => {
                  const stats = yearStats[year.academic_year] || { students: 0, companies: 0, placements: 0 }
                  const isProcessing = yearActionLoading === year.id
                  const statusClass =
                    year.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : year.status === 'ARCHIVED'
                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                  const StatusIcon = year.status === 'ACTIVE' ? CheckCircle2 : year.status === 'ARCHIVED' ? Archive : Clock

                  return (
                    <div key={year.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold">{year.academic_year}</h4>
                            {year.status === 'ACTIVE' && <Zap className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {year.start_date || 'No start'} to {year.end_date || 'No end'}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {year.college_name || 'College not set'} · {year.university || 'University not set'}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${statusClass}`}>
                          <StatusIcon className="h-3 w-3" />
                          {year.status}
                        </span>
                      </div>

                      <div className="mb-3 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-blue-50 p-2 text-center">
                          <Users className="mx-auto mb-1 h-3.5 w-3.5 text-blue-500" />
                          <div className="text-sm font-bold text-blue-700">{stats.students}</div>
                          <div className="text-[9px] text-blue-500">Students</div>
                        </div>
                        <div className="rounded-lg bg-purple-50 p-2 text-center">
                          <Building2 className="mx-auto mb-1 h-3.5 w-3.5 text-purple-500" />
                          <div className="text-sm font-bold text-purple-700">{stats.companies}</div>
                          <div className="text-[9px] text-purple-500">Companies</div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-2 text-center">
                          <Briefcase className="mx-auto mb-1 h-3.5 w-3.5 text-emerald-500" />
                          <div className="text-sm font-bold text-emerald-700">{stats.placements}</div>
                          <div className="text-[9px] text-emerald-500">Placements</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={() => openEditYearModal(year)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1.5 text-xs font-semibold hover:bg-muted/80 disabled:opacity-50"
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                        {year.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => updateAcademicYearStatus(year, 'ACTIVE')}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Activate
                          </button>
                        )}
                        {year.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => updateAcademicYearStatus(year, 'ARCHIVED')}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                          >
                            <Archive className="h-3 w-3" /> Archive
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteAcademicYear(year)}
                          disabled={isProcessing}
                          className="ml-auto inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" /> Delete Year
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="card-surface p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/15">
                <Mail className="h-5 w-5 text-info-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Notification Preferences</h3>
                <p className="text-xs text-muted-foreground">Configure email and platform notifications</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Email on new registration', desc: 'Receive an email when a student registers', checked: true },
                { label: 'Email on placement confirmation', desc: 'Receive an email when a student is placed', checked: true },
                { label: 'Daily summary digest', desc: 'Receive a daily summary of all activities', checked: false },
                { label: 'Drive deadline reminders', desc: 'Get notified 3 days before drive deadlines', checked: true },
              ].map((item) => (
                <label key={item.label} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    defaultChecked={item.checked}
                    className="mt-0.5 rounded border-input"
                  />
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>



          {/* Coordinators Account Management */}
          <div className="card-surface p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Coordinators Account Management</h3>
                <p className="text-xs text-muted-foreground">Add, edit, or delete department-level coordinator logins</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Form panel */}
              <div className="space-y-4 border-r border-border pr-0 md:pr-6">
                <h4 className="text-xs font-bold uppercase text-foreground">
                  {editingCoordEmail ? 'Edit Coordinator Account' : 'Create Coordinator Account'}
                </h4>
                <form onSubmit={handleCoordSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Email / Username</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingCoordEmail}
                      placeholder="e.g. coordinator-it@college.edu"
                      value={coordEmail}
                      onChange={(e) => setCoordEmail(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Coordinator Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IT Coordinator"
                      value={coordName}
                      onChange={(e) => setCoordName(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      {editingCoordEmail ? 'New Password (leave blank to keep current)' : 'Password'}
                    </label>
                    <input
                      type="password"
                      placeholder={editingCoordEmail ? '••••••••' : 'Password (defaults to coordinator123)'}
                      value={coordPassword}
                      onChange={(e) => setCoordPassword(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Department / Branch</label>
                    {showCustomBranch ? (
                      <div className="mt-1.5 flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Petroleum Engineering"
                          value={customBranchName}
                          onChange={(e) => setCustomBranchName(e.target.value)}
                          className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customBranchName.trim()) {
                              setCoordBranch(customBranchName.trim())
                              setShowCustomBranch(false)
                              setCustomBranchName('')
                            }
                          }}
                          className="h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-xs px-3 shadow-pop hover:opacity-95 cursor-pointer"
                        >
                          Set
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomBranch(false)
                            setCustomBranchName('')
                          }}
                          className="h-10 rounded-lg border border-input font-semibold text-xs px-3 hover:bg-muted text-foreground cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex gap-2">
                        <select
                          value={coordBranch}
                          onChange={(e) => setCoordBranch(e.target.value)}
                          className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring text-foreground bg-card"
                        >
                          {branchOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCustomBranch(true)}
                          title="Add a custom branch not in the list"
                          className="h-10 rounded-lg border border-input px-2.5 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {coordBranch && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Short name: <span className="font-bold text-foreground">{getShortBranchName(coordBranch)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-pop hover:opacity-95 transition flex items-center justify-center cursor-pointer"
                    >
                      {editingCoordEmail ? 'Update Coordinator' : 'Create Coordinator'}
                    </button>
                    {editingCoordEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCoordEmail(null)
                          setCoordName('')
                          setCoordEmail('')
                          setCoordPassword('')
                          setCoordBranch('Computer Science Engineering')
                        }}
                        className="h-10 rounded-lg border border-input font-semibold text-xs px-3 hover:bg-muted text-foreground transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List panel */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-foreground">Registered Coordinators</h4>
                {isLoadingCoords ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">Loading coordinators...</div>
                ) : coordinators.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
                    No coordinator accounts registered yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {coordinators.map((c) => (
                      <div
                        key={c.username}
                        className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all flex flex-col justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm truncate">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.username}</div>
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary w-fit mt-1.5">
                            {getShortBranchName(c.associated_id)}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-border/60 pt-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleEditCoord(c)}
                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Edit / Reset
                          </button>
                          <span className="text-muted-foreground/30 text-xs">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoord(c.username)}
                            className="text-[11px] font-semibold text-destructive hover:underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reset 2FA */}
          <div className="card-surface p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/15">
                <Shield className="h-5 w-5 text-warning-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Student 2FA Credentials Reset</h3>
                <p className="text-xs text-muted-foreground">Reset Two-Factor Authentication for students</p>
              </div>
            </div>

            <form onSubmit={handleReset2FA} className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Roll Numbers (comma separated)</label>
                <textarea
                  required
                  placeholder="e.g. 240CS001, 240CS002"
                  value={resetRollNumbers}
                  onChange={(e) => setResetRollNumbers(e.target.value)}
                  className="mt-1.5 min-h-[100px] w-full rounded-lg border border-input bg-background p-3 text-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring text-foreground resize-y"
                />
              </div>
              <button
                type="submit"
                disabled={isResetting2FA}
                className="h-10 px-4 rounded-lg bg-warning text-warning-foreground font-semibold text-sm shadow-pop hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
              >
                {isResetting2FA ? 'Resetting...' : 'Reset 2FA Credentials'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card-surface p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">{session?.name || 'Admin User'}</div>
                <div className="text-xs text-muted-foreground">{session?.email || 'admin@college.edu'}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">Super Admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last login</span>
                <span className="font-medium">Today, 14:32</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sessions</span>
                <span className="font-medium">1 active</span>
              </div>
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/15">
                <Lock className="h-5 w-5 text-warning-foreground" />
              </div>
              <h3 className="font-semibold">Security</h3>
            </div>
            <div className="space-y-3">
              {!isChangingPassword ? (
                <button type="button" onClick={() => setIsChangingPassword(true)} className="w-full rounded-lg border border-input px-3 py-2 text-left text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
                  Change Email / Password
                </button>
              ) : (
                <div className="rounded-lg border border-input p-3 space-y-3 bg-muted/20">
                  <h4 className="text-sm font-semibold">Update Credentials</h4>
                  <input
                    type="email"
                    placeholder="New Email"
                    value={adminNewEmail}
                    onChange={(e) => setAdminNewEmail(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="password"
                    placeholder="New Password (optional)"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="password"
                    placeholder="Current Password (required to save)"
                    value={adminCurrentPassword}
                    onChange={(e) => setAdminCurrentPassword(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                  <div className="flex gap-3 justify-end items-center mt-2">
                    <button type="button" onClick={() => setIsChangingPassword(false)} className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
                    <button type="button" onClick={handleChangeAdminPassword} disabled={isAdminPasswordSaving} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer transition">
                      {isAdminPasswordSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
              <button type="button" className="w-full rounded-lg border border-input px-3 py-2 text-left text-sm font-medium hover:bg-muted transition-colors">
                Two-factor authentication
              </button>
              <button type="button" className="w-full rounded-lg border border-input px-3 py-2 text-left text-sm font-medium hover:bg-muted transition-colors">
                Active sessions
              </button>
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-semibold">Danger Zone</h3>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('⚠️ Are you sure you want to reset ALL placement data?\n\nThis will permanently delete all students, companies, placements, forms, and notifications.\n\nThis action CANNOT be undone.')) return
                if (!confirm('🚨 FINAL WARNING: This will wipe everything. Type OK to confirm.')) return
                try {
                  await wipeAllData()
                  alert('All placement data has been successfully wiped. The dashboard will now show empty stats.')
                  window.location.reload()
                } catch (err: any) {
                  alert(`Error wiping data: ${err.message}`)
                }
              }}
              className="w-full rounded-lg border border-destructive/30 px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
            >
              Reset all placement data
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
        >
          <Save className="h-4 w-4" /> Save changes
        </button>
        {saved && (
          <span className="text-sm font-semibold text-success animate-in fade-in">
            ✓ Settings saved successfully
          </span>
        )}
      </div>

      {showYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card-surface w-full max-w-2xl p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  College details are saved with this academic year.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowYearModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            </div>

            {yearError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" /> {yearError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Academic year</label>
                <input
                  value={yearForm.academic_year}
                  onChange={(e) => setYearForm({ ...yearForm, academic_year: e.target.value })}
                  placeholder="2027-2028"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={yearForm.status}
                  onChange={(e) => setYearForm({ ...yearForm, status: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Start date</label>
                <input
                  type="date"
                  value={yearForm.start_date}
                  onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End date</label>
                <input
                  type="date"
                  value={yearForm.end_date}
                  onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">College name</label>
                <input
                  value={yearForm.college_name}
                  onChange={(e) => setYearForm({ ...yearForm, college_name: e.target.value })}
                  placeholder="e.g. National Institute of Technology"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">University</label>
                <input
                  value={yearForm.university}
                  onChange={(e) => setYearForm({ ...yearForm, university: e.target.value })}
                  placeholder="e.g. Autonomous"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <input
                  value={yearForm.college_location}
                  onChange={(e) => setYearForm({ ...yearForm, college_location: e.target.value })}
                  placeholder="Hyderabad, Telangana"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Website</label>
                <input
                  value={yearForm.college_website}
                  onChange={(e) => setYearForm({ ...yearForm, college_website: e.target.value })}
                  placeholder="www.college.edu"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowYearModal(false)}
                className="h-10 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAcademicYear}
                disabled={yearActionLoading === -1}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 disabled:opacity-50"
              >
                {yearActionLoading === -1 ? 'Saving...' : editingYear ? 'Update Year' : 'Create Year'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Data Confirmation Popup */}
      {wipeConfirmYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Wipe Academic Data?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Academic Year {wipeConfirmYear}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              The archive data for <span className="font-bold text-foreground">{wipeConfirmYear}</span> has been downloaded successfully.
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              Do you want to <span className="font-bold text-destructive">permanently delete</span> this academic year's data from the database? This action <span className="font-bold text-destructive">cannot be undone</span>.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeletingArchive}
                onClick={() => handleWipeArchive(wipeConfirmYear)}
                className="flex-1 h-11 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm shadow-pop hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingArchive ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive-foreground border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete Permanently'
                )}
              </button>
              <button
                type="button"
                disabled={isDeletingArchive}
                onClick={() => setWipeConfirmYear(null)}
                className="flex-1 h-11 rounded-lg border border-input bg-card font-semibold text-sm text-foreground hover:bg-muted transition disabled:opacity-50 cursor-pointer"
              >
                No, Keep Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
