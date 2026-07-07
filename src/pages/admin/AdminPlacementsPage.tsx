import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Download, Search, Plus, Columns, Filter, Pencil, Trash2, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  loadPlacements,
  savePlacements,
  loadPlacementForms,
  loadFormSubmissions,
  loadMasterRows,
  addPlacementNotification,
  loadCompanies,
  type PlacementOffer,
  type PlacementForm,
  type FormSubmission,
  useStoreState,
} from '../../lib/placeproStore'
import { getShortBranchName, getAllShortBranches } from '../../lib/branchUtils'

export function AdminPlacementsPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const formIdParam = searchParams.get('formId')

  const [activeTab, setActiveTab] = useState<'repository' | 'add' | 'comparison'>(() => {
    if (tabParam === 'comparison' || tabParam === 'add' || tabParam === 'repository') {
      return tabParam
    }
    return 'repository'
  })
  const placementsList = useStoreState(loadPlacements) ?? []

  const [search, setSearch] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Edit modal state
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editStudent, setEditStudent] = useState('')
  const [editRoll, setEditRoll] = useState('')
  const [editBranch, setEditBranch] = useState('CSE')
  const [editCompany, setEditCompany] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editPkg, setEditPkg] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editType, setEditType] = useState<'On-campus' | 'Off-campus'>('On-campus')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')

  // Delete confirmation
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)

  const formsList = useStoreState(loadPlacementForms) ?? []
  const allSubmissions = useStoreState(loadFormSubmissions) ?? []
  const masterRows = useStoreState(loadMasterRows) ?? []



  // Manual Selection state
  const [manualName, setManualName] = useState('')
  const [manualRoll, setManualRoll] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualBranch, setManualBranch] = useState('CSE')
  const [manualRole, setManualRole] = useState('')
  const [manualCompany, setManualCompany] = useState('')
  const [manualPkg, setManualPkg] = useState('')
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0])
  const [manualType, setManualType] = useState<'On-campus' | 'Off-campus'>('On-campus')

  // Comparison/Filter states
  const [selectedFormId, setSelectedFormId] = useState(() => formIdParam || '')
  const [filterBranch, setFilterBranch] = useState('All')
  const [filterMinCgpa, setFilterMinCgpa] = useState('')
  const [filterMaxBacklogs, setFilterMaxBacklogs] = useState('')

  // Company exclusion filter states
  const [excludedCompanies, setExcludedCompanies] = useState<string[]>([])
  const [companySearch, setCompanySearch] = useState('')
  const hasInitializedExclusions = useRef(false)

  const allUniqueCompanies = useMemo(() => {
    const fromPlacements = placementsList.map((p) => p.company.trim())
    const fromCompanies = loadCompanies().map((c) => c.name.trim())
    const merged = Array.from(new Set([...fromPlacements, ...fromCompanies]))
    return merged.sort((a, b) => a.localeCompare(b))
  }, [placementsList])

  const displayedCompanies = useMemo(() => {
    return allUniqueCompanies.filter((c) =>
      c.toLowerCase().includes(companySearch.toLowerCase())
    )
  }, [allUniqueCompanies, companySearch])

  useEffect(() => {
    if (!hasInitializedExclusions.current && allUniqueCompanies.length > 0) {
      setExcludedCompanies(allUniqueCompanies)
      hasInitializedExclusions.current = true
    } else {
      setExcludedCompanies((prev) => {
        const stillExists = prev.filter((c) => allUniqueCompanies.includes(c))
        const added = allUniqueCompanies.filter((c) => !prev.includes(c))
        if (added.length > 0) {
          return [...stillExists, ...added]
        }
        return stillExists
      })
    }
  }, [allUniqueCompanies])

  useEffect(() => {
    if (formsList.length > 0 && !selectedFormId) {
      setSelectedFormId(formIdParam || formsList[0].id)
    }
  }, [formsList, selectedFormId, formIdParam])

  const totalOffers = placementsList.length
  const uniqueCompanies = new Set(placementsList.map((p) => p.company)).size
  const avgPackage = useMemo(() => {
    if (placementsList.length === 0) return '0.0'
    const sum = placementsList.reduce((acc, p) => {
      const match = p.package.match(/(\d+(?:\.\d+)?)/)
      const num = match ? parseFloat(match[1]) : 0
      return acc + num
    }, 0)
    return (sum / placementsList.length).toFixed(1)
  }, [placementsList])

  const filteredPlacements = placementsList.filter(
    (p) =>
      p.student.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.branch.toLowerCase().includes(search.toLowerCase()),
  )

  function openEditModal(idx: number) {
    const p = placementsList[idx]
    if (!p) return
    setEditingIdx(idx)
    setEditStudent(p.student)
    setEditRoll(p.id)
    setEditBranch(p.branch)
    setEditCompany(p.company)
    setEditRole(p.role)
    const pkgMatch = p.package.match(/(\d+(?:\.\d+)?)/)
    setEditPkg(pkgMatch ? pkgMatch[1] : '')
    setEditDate(p.date)
    setEditType(p.type as 'On-campus' | 'Off-campus')
    setEditEmail(p.email || '')
    setEditPhone(p.phone || '')
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingIdx === null) return

    const normalizedRoll = editRoll.trim().toUpperCase()
    const studentExists = masterRows.some(
      (s) => s.rollNumber.trim().toUpperCase() === normalizedRoll
    )
    if (!studentExists) {
      alert(`Error: Student Roll Number "${editRoll}" does not exist in the Master Student database. Edit rejected.`)
      return
    }

    const updated: PlacementOffer = {
      student: editStudent.trim(),
      id: normalizedRoll,
      branch: editBranch,
      company: editCompany.trim(),
      role: editRole.trim(),
      package: `₹ ${editPkg} LPA`,
      date: editDate,
      type: editType,
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
    }
    savePlacements(placementsList.map((p, i) => (i === editingIdx ? updated : p)))
    addPlacementNotification(updated)
    setEditingIdx(null)
    showToast(`Updated placement record for ${updated.student}.`)
  }

  function handleDelete(idx: number) {
    const p = placementsList[idx]
    savePlacements(placementsList.filter((_, i) => i !== idx))
    setDeleteIdx(null)
    showToast(`Deleted placement record for ${p?.student ?? 'student'}.`)
  }

  function downloadOffersExcel() {
    const exportRows = placementsList.map((p) => ({
      'Student Name': p.student,
      'Roll Number': p.id,
      'Branch': p.branch,
      'Company': p.company,
      'Role': p.role,
      'Package': p.package,
      'Date': p.date,
      'Type': p.type,
      'Email': p.email || '',
      'Phone': p.phone || '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Placement Offers')
    XLSX.writeFile(workbook, 'placement-offers-repository.xlsx')
    showToast('Downloaded placement offers as Excel.')
  }

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Manual Selection submit
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualRoll || !manualName || !manualCompany || !manualPkg || !manualRole) return

    const normalizedRoll = manualRoll.trim().toUpperCase()
    const studentExists = masterRows.some(
      (s) => s.rollNumber.trim().toUpperCase() === normalizedRoll
    )
    if (!studentExists) {
      alert(`Error: Student Roll Number "${manualRoll}" does not exist in the Master Student database. Manual selection registration rejected.`)
      return
    }

    const newOffer: PlacementOffer = {
      student: manualName.trim(),
      id: normalizedRoll,
      branch: manualBranch,
      company: manualCompany.trim(),
      role: manualRole.trim(),
      package: `₹ ${manualPkg} LPA`,
      date: manualDate,
      type: manualType,
      email: manualEmail.trim() || undefined,
      phone: manualPhone.trim() || undefined,
    }

    savePlacements([newOffer, ...placementsList])
    addPlacementNotification(newOffer)
    
    setManualName('')
    setManualRoll('')
    setManualEmail('')
    setManualPhone('')
    setManualBranch('CSE')
    setManualRole('')
    setManualCompany('')
    setManualPkg('')
    setManualDate(new Date().toISOString().split('T')[0])
    setManualType('On-campus')
    
    setActiveTab('repository')
    showToast(`Registered selection for student ${newOffer.student} at ${newOffer.company}!`)
  }

  const dynamicComparisonList = useMemo(() => {
    if (!selectedFormId) return []
    const formSubs = allSubmissions.filter((sub) => sub.formId === selectedFormId)

    const byRoll = new Map<string, FormSubmission>()
    formSubs.forEach((sub) => {
      byRoll.set(sub.roll.trim().toUpperCase(), sub)
    })

    const uniqueSubs = Array.from(byRoll.values())
    
    // Only exclude students placed in checked companies
    const excludedPlacements = placementsList.filter((p) =>
      excludedCompanies.includes(p.company.trim())
    )
    const placedRolls = new Set(excludedPlacements.map((p) => p.id.trim().toUpperCase()))

    const unplacedSubs = uniqueSubs.filter((sub) => !placedRolls.has(sub.roll.trim().toUpperCase()))

    return unplacedSubs.filter((sub) => {
      const mRow = masterRows.find(
        (m) => m.rollNumber.trim().toUpperCase() === sub.roll.trim().toUpperCase()
      )
      
      if (filterBranch && filterBranch !== 'All') {
        const branchVal = mRow?.branch || sub.values['Branch'] || ''
        if (branchVal.trim().toUpperCase() !== filterBranch.toUpperCase()) return false
      }

      if (filterMinCgpa) {
        const cgpaVal = parseFloat(mRow?.btechCgpa || sub.values['CGPA'] || '0') || 0
        if (cgpaVal < parseFloat(filterMinCgpa)) return false
      }

      if (filterMaxBacklogs) {
        const backlogsVal = parseInt(mRow?.activeBacklogs || sub.values['NO OF BACKLOGS'] || '0', 10) || 0
        if (backlogsVal > parseInt(filterMaxBacklogs, 10)) return false
      }

      return true
    })
  }, [allSubmissions, selectedFormId, placementsList, masterRows, filterBranch, filterMinCgpa, filterMaxBacklogs, excludedCompanies])

  function handleDownloadComparisonList() {
    const form = formsList.find((f) => f.id === selectedFormId)
    if (!form) return

    const exportRows = dynamicComparisonList.map((submission) => {
      const masterRow = masterRows.find(
        (m) => m.rollNumber.trim().toUpperCase() === submission.roll.trim().toUpperCase()
      )
      return {
        'Roll Number': submission.roll,
        'Student Name': submission.name,
        'Submitted At': submission.submittedAt,
        'CGPA': masterRow?.btechCgpa || submission.values['CGPA'] || '-',
        '10th %': masterRow?.tenthPercentage || '-',
        '12th %': masterRow?.twelfthPercentage || '-',
        'Branch': masterRow?.branch || submission.values['Branch'] || '-',
        'Email': masterRow?.mailId || '-',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Eligible Candidates')
    XLSX.writeFile(workbook, `${form.name.replace(/\s+/g, '_').toLowerCase()}_unplaced_eligible.xlsx`)
    showToast('Eligible unplaced candidates list downloaded!')
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Placements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register company selections and build eligible candidate databases filtered by unplaced status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => showToast('Exported placement metrics report PDF.')}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted cursor-pointer"
        >
          <Download className="h-4 w-4" /> Export report
        </button>
      </div>

      <div className="mb-6 border-b border-border flex gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('repository')}
          className={`pb-3 transition-colors relative ${activeTab === 'repository' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Offers Repository
          {activeTab === 'repository' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`pb-3 transition-colors relative ${activeTab === 'add' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Add Selection (Manual)
          {activeTab === 'add' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`pb-3 transition-colors relative ${activeTab === 'comparison' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Company Filter & Comparison
          {activeTab === 'comparison' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {activeTab === 'repository' && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="card-surface p-5">
              <div className="text-2xl font-bold">{totalOffers}</div>
              <div className="text-sm text-muted-foreground">Total offers</div>
            </div>
            <div className="card-surface p-5">
              <div className="text-2xl font-bold">{uniqueCompanies}</div>
              <div className="text-sm text-muted-foreground">Companies recruiting</div>
            </div>
            <div className="card-surface p-5">
              <div className="text-2xl font-bold">₹ {avgPackage} LPA</div>
              <div className="text-sm text-muted-foreground">Average package</div>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search by roll number, student, company, or branch…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="button"
              onClick={downloadOffersExcel}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download Excel
            </button>
          </div>

          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Student</th>
                    <th className="px-5 py-3 font-medium">Roll Number</th>
                    <th className="px-5 py-3 font-medium">Branch</th>
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Package</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlacements.map((p, idx) => (
                    <tr key={`${p.id}-${idx}`} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3 font-medium">
                        <div>
                          <div className="font-bold text-foreground">{p.student}</div>
                          {(p.email || p.phone) && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {p.email} {p.phone && `· ${p.phone}`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <Link to={`/admin/students?search=${p.id}`} className="text-primary hover:underline font-mono">
                          {p.id}
                        </Link>
                      </td>
                      <td className="px-5 py-3">{getShortBranchName(p.branch)}</td>
                      <td className="px-5 py-3 font-bold">{p.company}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.role}</td>
                      <td className="px-5 py-3 font-semibold text-success">{p.package}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.type === 'On-campus' ? 'bg-primary/10 text-primary' : 'bg-warning/15 text-warning-foreground'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(placementsList.indexOf(p))}
                            className="inline-flex h-8 items-center gap-1 rounded border border-input px-2 text-xs font-semibold hover:bg-muted cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteIdx(placementsList.indexOf(p))}
                            className="inline-flex h-8 items-center gap-1 rounded bg-destructive/10 px-2 text-xs font-semibold text-destructive hover:bg-destructive/20 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'add' && (
        <div className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <div className="card-surface p-5 md:p-6 space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-primary" /> Register Manual Selection Entry
              </h2>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Student Roll Number</label>
                    <input type="text" required placeholder="e.g. CSE21001" value={manualRoll} onChange={(e) => setManualRoll(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Student Full Name</label>
                    <input type="text" required placeholder="e.g. Rahul Sharma" value={manualName} onChange={(e) => setManualName(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Email Address</label>
                    <input type="email" required placeholder="e.g. rahul@example.com" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                    <input type="tel" required placeholder="e.g. 9876543210" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Branch</label>
                    <select value={manualBranch} onChange={(e) => setManualBranch(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring text-foreground bg-card">
                      {getAllShortBranches(masterRows.map((r) => r.branch)).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Job Role / Designation</label>
                    <input type="text" required placeholder="e.g. Software Engineer" value={manualRole} onChange={(e) => setManualRole(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Recruiting Company</label>
                    <input type="text" required placeholder="e.g. Uber" value={manualCompany} onChange={(e) => setManualCompany(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Offered Package (LPA)</label>
                    <input type="number" step="0.1" required placeholder="e.g. 15.5" value={manualPkg} onChange={(e) => setManualPkg(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Placement Date</label>
                    <input type="date" required value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Placement Type</label>
                    <select value={manualType} onChange={(e) => setManualType(e.target.value as 'On-campus' | 'Off-campus')} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring">
                      <option value="On-campus">On-campus</option><option value="Off-campus">Off-campus</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer mt-2">
                  Register Selection
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="card-surface p-5 md:p-6 space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Columns className="h-4 w-4 text-primary" /> Select Drive & Filters
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select a company drive registration form to see candidate submissions. Placed students are automatically filtered out.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Company Form</label>
                  <select
                    value={selectedFormId}
                    onChange={(e) => setSelectedFormId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a form...</option>
                    {formsList.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.companyName || 'General'})</option>
                    ))}
                  </select>
                </div>
                {selectedFormId && (() => {
                  const form = formsList.find((f) => f.id === selectedFormId) as PlacementForm | undefined
                  if (!form) return null
                  return (
                    <div className="border border-border rounded-lg p-3 bg-muted/10 text-xs space-y-2">
                      <div className="font-bold text-foreground">{form.name}</div>
                      {form.companyName && <div><span className="text-muted-foreground">Company:</span> <span className="font-semibold text-foreground">{form.companyName}</span></div>}
                      {form.companyPkgMin && <div><span className="text-muted-foreground">Package:</span> <span className="font-semibold text-foreground">₹ {form.companyPkgMin} {form.companyPkgMax ? `– ${form.companyPkgMax}` : ''} LPA</span></div>}
                    </div>
                  )
                })()}
                <div className="border-t border-border pt-4 space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5 text-primary" /> Filter Submissions
                  </h3>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Branch / Department</label>
                    <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring">
                      <option value="All">All Branches</option><option value="CSE">CSE</option><option value="ECE">ECE</option><option value="EE">EE</option><option value="ME">ME</option><option value="CE">CE</option><option value="IT">IT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Min B.Tech CGPA</label>
                    <input type="number" step="0.01" placeholder="e.g. 8.0" value={filterMinCgpa} onChange={(e) => setFilterMinCgpa(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Max Active Backlogs</label>
                    <input type="number" placeholder="e.g. 0" value={filterMaxBacklogs} onChange={(e) => setFilterMaxBacklogs(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring" />
                  </div>
                  
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Exclude Placed Students
                      </label>
                      <div className="flex gap-2 text-[10px] font-bold text-primary">
                        <button
                          type="button"
                          onClick={() => setExcludedCompanies(allUniqueCompanies)}
                          className="hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-muted-foreground/30">|</span>
                        <button
                          type="button"
                          onClick={() => setExcludedCompanies([])}
                          className="hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      Students placed in checked companies will be filtered out. Unchecked companies' students remain eligible.
                    </p>

                    {allUniqueCompanies.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Search companies..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:border-ring"
                        />
                        <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-background space-y-1.5">
                          {displayedCompanies.map((c) => {
                            const isChecked = excludedCompanies.includes(c)
                            return (
                              <label key={c} className="flex items-start gap-2 text-xs font-medium cursor-pointer hover:bg-muted/40 p-0.5 rounded transition">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setExcludedCompanies((prev) =>
                                      isChecked
                                        ? prev.filter((item) => item !== c)
                                        : [...prev, c]
                                    )
                                  }}
                                  className="rounded border-input text-primary mt-0.5"
                                />
                                <span className="truncate">{c}</span>
                              </label>
                            )
                          })}
                          {displayedCompanies.length === 0 && (
                            <div className="text-center text-[11px] text-muted-foreground py-2">
                              No companies match search
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground py-4 bg-muted/20 border border-dashed border-border rounded-lg mt-2">
                        No companies registered yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="card-surface overflow-hidden md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                  <h3 className="font-bold text-foreground">Eligible Students (Unplaced Only)</h3>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary font-mono">{dynamicComparisonList.length} qualified</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                        <th className="px-5 py-2.5 font-medium">Roll Number</th>
                        <th className="px-5 py-2.5 font-medium">Student Name</th>
                        <th className="px-5 py-2.5 font-medium">Branch</th>
                        <th className="px-5 py-2.5 font-medium">CGPA</th>
                        <th className="px-5 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dynamicComparisonList.map((s) => {
                        const mRow = masterRows.find((m) => m.rollNumber.trim().toUpperCase() === s.roll.trim().toUpperCase())
                        return (
                          <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-5 py-2.5">
                              <Link to={`/admin/students?search=${s.roll}`} className="text-primary hover:underline font-mono">
                                {s.roll}
                              </Link>
                            </td>
                            <td className="px-5 py-2.5 font-bold">{s.name}</td>
                            <td className="px-5 py-2.5">{mRow?.branch || s.values['Branch'] || '-'}</td>
                            <td className="px-5 py-2.5 font-mono">{mRow?.btechCgpa || s.values['CGPA'] || '-'}</td>
                            <td className="px-5 py-2.5"><span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">Unplaced & Eligible</span></td>
                          </tr>
                        )
                      })}
                      {dynamicComparisonList.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground italic">No eligible unplaced candidates found for the selected drive/filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                <button
                  onClick={handleDownloadComparisonList}
                  disabled={dynamicComparisonList.length === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-pop hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Download Filtered Eligible List (Excel)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Placement Modal */}
      {editingIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setEditingIdx(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-foreground">Edit Placement Record</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Modify placement details. Changes are saved immediately.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Roll Number</label>
                  <input type="text" required value={editRoll} onChange={(e) => setEditRoll(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Student Name</label>
                  <input type="text" required value={editStudent} onChange={(e) => setEditStudent(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Phone</label>
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Company</label>
                  <input type="text" required value={editCompany} onChange={(e) => setEditCompany(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
                  <input type="text" required value={editRole} onChange={(e) => setEditRole(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Branch</label>
                  <select value={editBranch} onChange={(e) => setEditBranch(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring">
                    <option value="CSE">CSE</option><option value="ECE">ECE</option><option value="EE">EE</option><option value="ME">ME</option><option value="CE">CE</option><option value="IT">IT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Package (LPA)</label>
                  <input type="number" step="0.1" required value={editPkg} onChange={(e) => setEditPkg(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Type</label>
                  <select value={editType} onChange={(e) => setEditType(e.target.value as 'On-campus' | 'Off-campus')} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring">
                    <option value="On-campus">On-campus</option><option value="Off-campus">Off-campus</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Date</label>
                <input type="date" required value={editDate} onChange={(e) => setEditDate(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => setEditingIdx(null)} className="h-10 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
                <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-foreground">Delete Placement Record</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete the placement record for <strong>{placementsList[deleteIdx]?.student}</strong> at <strong>{placementsList[deleteIdx]?.company}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteIdx(null)} className="h-10 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button type="button" onClick={() => handleDelete(deleteIdx)} className="h-10 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground shadow-pop hover:opacity-95">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
