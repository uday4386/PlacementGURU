import { useEffect, useMemo, useState } from 'react'
import { Building2, Globe, Lock, Mail, Plus, Save, Shield, User } from 'lucide-react'
import { getAuthToken } from '../../lib/auth'
import { getShortBranchName, getAllBranchOptions } from '../../lib/branchUtils'
import { loadMasterRows, useStoreState, wipeAllData } from '../../lib/placeproStore'

export function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [archives, setArchives] = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState('2026-2027')
  const [isArchiving, setIsArchiving] = useState(false)
  const [isLoadingArchives, setIsLoadingArchives] = useState(true)
  const [wipeConfirmYear, setWipeConfirmYear] = useState<string | null>(null)
  const [isDeletingArchive, setIsDeletingArchive] = useState(false)

  const [coordinators, setCoordinators] = useState<any[]>([])
  const [isLoadingCoords, setIsLoadingCoords] = useState(true)
  const [coordName, setCoordName] = useState('')
  const [coordEmail, setCoordEmail] = useState('')
  const [coordPassword, setCoordPassword] = useState('')
  const [coordBranch, setCoordBranch] = useState('Computer Science Engineering')
  const [editingCoordEmail, setEditingCoordEmail] = useState<string | null>(null)
  const [showCustomBranch, setShowCustomBranch] = useState(false)
  const [customBranchName, setCustomBranchName] = useState('')

  const masterRows = useStoreState(loadMasterRows) ?? []

  // Dynamically build branch options from defaults + master data + existing coordinators
  const branchOptions = useMemo(() => {
    const masterBranches = masterRows.map((r) => r.branch)
    const coordBranches = coordinators.map((c: any) => c.department || '')
    return getAllBranchOptions([...masterBranches, ...coordBranches])
  }, [masterRows, coordinators])

  useEffect(() => {
    fetchArchives()
    fetchCoordinators()
  }, [])

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

  async function handleCreateArchive() {
    setIsArchiving(true)
    try {
      const token = getAuthToken()
      const res = await fetch('/api/admin/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ academicYear: selectedYear })
      })

      if (res.ok) {
        alert(`Successfully archived academic year ${selectedYear} on the backend!`)
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

  async function handleDownloadArchive(year: string) {
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
                <p className="text-xs text-muted-foreground">Basic institutional details</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">College name</label>
                <input
                  defaultValue="National Institute of Technology"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">University</label>
                <input
                  defaultValue="Autonomous"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <input
                  defaultValue="Hyderabad, Telangana"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Website</label>
                <input
                  defaultValue="www.nith.ac.in"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Placement Settings */}
          <div className="card-surface p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Globe className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">Placement Configuration</h3>
                <p className="text-xs text-muted-foreground">Current placement season settings</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Current batch</label>
                <select className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                  <option>2026</option>
                  <option>2025</option>
                  <option>2024</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Season</label>
                <select className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                  <option>On-campus</option>
                  <option>Off-campus</option>
                  <option>Internship</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Registration deadline</label>
                <input
                  type="date"
                  defaultValue="2026-07-31"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max offers per student</label>
                <input
                  type="number"
                  defaultValue="2"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
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

          {/* Academic Year Archives */}
          <div className="card-surface p-5 md:p-6 bg-gradient-to-br from-card to-muted/20">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Academic Year Archives</h3>
                <p className="text-xs text-muted-foreground">Snapshot and download all placement details for a specific academic year</p>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3 items-end mb-6">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground">Select Academic Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
                >
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2027-2028">2027-2028</option>
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleCreateArchive}
                  disabled={isArchiving}
                  className="h-10 w-full rounded-lg bg-primary text-primary-foreground font-semibold px-4 text-sm shadow-pop hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isArchiving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Archiving...
                    </>
                  ) : (
                    'Archive on Server'
                  )}
                </button>
              </div>
            </div>

            <hr className="border-border my-5" />

            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Archived Academic Years</h4>
              {isLoadingArchives ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Loading archives...</div>
              ) : archives.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
                  No archives created yet. Select a year above to save a data snapshot.
                </div>
              ) : (
                <div className="space-y-3">
                  {archives.map((archive) => (
                    <div
                      key={archive.academicYear}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all gap-3"
                    >
                      <div>
                        <div className="font-bold text-foreground text-sm">
                          Academic Year {archive.academicYear}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Archived on: {archive.archivedAt ? new Date(archive.archivedAt).toLocaleString() : 'N/A'}
                        </div>
                        {archive.counts && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100/80 text-blue-800">
                              Students: {archive.counts.students}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100/80 text-green-800">
                              Companies: {archive.counts.companies}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100/80 text-purple-800">
                              Placements: {archive.counts.placements}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800">
                              Forms: {archive.counts.forms}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadArchive(archive.academicYear)}
                        className="text-xs font-semibold text-primary hover:underline hover:text-indigo-600 flex items-center gap-1 shrink-0 cursor-pointer self-end sm:self-center"
                      >
                        Download Data (JSON)
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                      type="email"
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card-surface p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Admin User</div>
                <div className="text-xs text-muted-foreground">admin@college.edu</div>
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
              <button type="button" className="w-full rounded-lg border border-input px-3 py-2 text-left text-sm font-medium hover:bg-muted transition-colors">
                Change password
              </button>
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
