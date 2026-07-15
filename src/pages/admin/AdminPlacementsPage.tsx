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
import {
  getAcademicYearFromDate,
  getAcademicYearFromYop,
  normalizeAcademicYear,
  useAcademicYear,
} from '../../lib/AcademicYearContext'

export function AdminPlacementsPage() {
  const { selectedYear } = useAcademicYear()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const formIdParam = searchParams.get('formId')

  const [activeTab, setActiveTab] = useState<'repository' | 'add' | 'comparison'>(() => {
    if (tabParam === 'comparison' || tabParam === 'add' || tabParam === 'repository') {
      return tabParam
    }
    return 'repository'
  })
  const allPlacements = useStoreState(loadPlacements) ?? []

  const [search, setSearch] = useState('')
  const [showRepoFilters, setShowRepoFilters] = useState(false)
  const [repoFilterCompany, setRepoFilterCompany] = useState('All')
  const [repoFilterRole, setRepoFilterRole] = useState('All')
  const [repoFilterType, setRepoFilterType] = useState('All')
  const [repoFilterDate, setRepoFilterDate] = useState('')
  const [repoFilterPackage, setRepoFilterPackage] = useState('')
  const [repoFilterBranch, setRepoFilterBranch] = useState('All')
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

  const allForms = useStoreState(loadPlacementForms) ?? []
  const allSubmissions = useStoreState(loadFormSubmissions) ?? []
  const allMasterRows = useStoreState(loadMasterRows) ?? []
  const allCompanies = useStoreState(loadCompanies) ?? []

  const placementsList = useMemo(
    () =>
      allPlacements.filter(
        (placement) => (placement.academicYear || getAcademicYearFromDate(placement.date)) === selectedYear,
      ),
    [allPlacements, selectedYear],
  )
  const formsList = useMemo(
    () =>
      allForms.filter((form) => {
        const companyYear = normalizeAcademicYear(form.academicYear || form.companyAcademicYear || '')
        return companyYear
          ? companyYear === selectedYear
          : getAcademicYearFromDate(form.created) === selectedYear
      }),
    [allForms, selectedYear],
  )
  const masterRows = useMemo(
    () =>
      allMasterRows.filter(
        (row) => (row.academicYear || getAcademicYearFromYop(row.btechYop)) === selectedYear,
      ),
    [allMasterRows, selectedYear],
  )
  const companiesList = useMemo(
    () =>
      allCompanies.filter(
        (company) => normalizeAcademicYear(company.academicYear) === selectedYear,
      ),
    [allCompanies, selectedYear],
  )



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
  const [filterSpecialConcerns, setFilterSpecialConcerns] = useState('')

  // Company exclusion filter states
  const [excludedCompanies, setExcludedCompanies] = useState<string[]>([])
  const [companySearch, setCompanySearch] = useState('')
  const hasInitializedExclusions = useRef(false)
  const knownCompaniesRef = useRef<Set<string>>(new Set())

  const [selectedComparisonColumns, setSelectedComparisonColumns] = useState<string[]>([
    'Roll Number',
    'Student Name',
    'Branch',
    'CGPA',
    'Status',
  ])
  const [showComparisonColSelector, setShowComparisonColSelector] = useState(false)

  const comparisonColumnsList = useMemo(() => {
    const selectedForm = formsList.find((f) => f.id === selectedFormId)
    const standardCols = [
      { key: 'Roll Number', label: 'Roll Number', default: true },
      { key: 'Student Name', label: 'Student Name', default: true },
      { key: 'Branch', label: 'Branch', default: true },
      { key: 'CGPA', label: 'CGPA', default: true },
      { key: '10th %', label: '10th %', default: false },
      { key: '12th %', label: '12th %', default: false },
      { key: 'Active Backlogs', label: 'Active Backlogs', default: false },
      { key: 'Email', label: 'Email', default: false },
      { key: 'Phone', label: 'Phone', default: false },
      { key: 'Status', label: 'Status', default: true },
    ]
    if (!selectedForm) return standardCols
    const standardKeys = new Set(standardCols.map((c) => c.key.toUpperCase()))
    const customFields = selectedForm.fields
      .filter((f) => !standardKeys.has(f.label.toUpperCase()))
      .map((f) => ({
        key: f.label,
        label: f.label,
        default: false,
      }))
    return [...standardCols, ...customFields]
  }, [selectedFormId, formsList])

  const prevFormIdForColsRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedFormId !== prevFormIdForColsRef.current) {
      prevFormIdForColsRef.current = selectedFormId
      const defaults = comparisonColumnsList.filter((col) => col.default).map((col) => col.key)
      setSelectedComparisonColumns(defaults)
      setShowComparisonColSelector(false)
    }
  }, [selectedFormId, comparisonColumnsList])

  const allUniqueCompanies = useMemo(() => {
    const fromPlacements = placementsList.map((p) => p.company.trim())
    const fromCompanies = companiesList.map((c) => c.name.trim())
    const merged = Array.from(new Set([...fromPlacements, ...fromCompanies]))
    return merged.sort((a, b) => a.localeCompare(b))
  }, [companiesList, placementsList])

  const displayedCompanies = useMemo(() => {
    return allUniqueCompanies.filter((c) =>
      c.toLowerCase().includes(companySearch.toLowerCase())
    )
  }, [allUniqueCompanies, companySearch])

  useEffect(() => {
    if (!hasInitializedExclusions.current && allUniqueCompanies.length > 0) {
      setExcludedCompanies(allUniqueCompanies)
      hasInitializedExclusions.current = true
      knownCompaniesRef.current = new Set(allUniqueCompanies)
    } else if (hasInitializedExclusions.current) {
      const brandNewCompanies = allUniqueCompanies.filter((c) => !knownCompaniesRef.current.has(c))
      knownCompaniesRef.current = new Set(allUniqueCompanies)

      setExcludedCompanies((prev) => {
        const stillExists = prev.filter((c) => allUniqueCompanies.includes(c))
        if (brandNewCompanies.length > 0) {
          return [...stillExists, ...brandNewCompanies]
        }
        if (stillExists.length !== prev.length) {
          return stillExists
        }
        return prev
      })
    }
  }, [allUniqueCompanies])

  useEffect(() => {
    if (formsList.length === 0) {
      if (selectedFormId) setSelectedFormId('')
      return
    }

    const hasSelectedForm = formsList.some((form) => form.id === selectedFormId)
    if (!hasSelectedForm) {
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

  const uniqueRepoCompanies = useMemo(() => Array.from(new Set(placementsList.map((p) => p.company))).sort(), [placementsList])
  const uniqueRepoRoles = useMemo(() => Array.from(new Set(placementsList.map((p) => p.role))).sort(), [placementsList])
  const uniqueRepoBranches = useMemo(() => Array.from(new Set(placementsList.map((p) => p.branch))).sort(), [placementsList])

  const filteredPlacements = placementsList.filter((p) => {
    const matchesSearch =
      p.student.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.branch.toLowerCase().includes(search.toLowerCase())

    const matchesCompany = repoFilterCompany === 'All' || p.company === repoFilterCompany
    const matchesRole = repoFilterRole === 'All' || p.role === repoFilterRole
    const matchesType = repoFilterType === 'All' || p.type === repoFilterType
    const matchesDate = !repoFilterDate || p.date === repoFilterDate
    const matchesPackage = !repoFilterPackage || p.package.includes(repoFilterPackage)
    const matchesBranch = repoFilterBranch === 'All' || p.branch === repoFilterBranch

    return matchesSearch && matchesCompany && matchesRole && matchesType && matchesDate && matchesPackage && matchesBranch
  })

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
    savePlacements(allPlacements.map((p, i) => (i === editingIdx ? updated : p)))
    addPlacementNotification(updated)
    setEditingIdx(null)
    showToast(`Updated placement record for ${updated.student}.`)
  }

  function handleDelete(idx: number) {
    const p = placementsList[idx]
    savePlacements(allPlacements.filter((_, i) => i !== idx))
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

    savePlacements([newOffer, ...allPlacements])
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

    const specialRolls = new Set(
      filterSpecialConcerns
        .split(/[\s,]+/)
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean)
    )

    const byRoll = new Map<string, FormSubmission>()
    formSubs.forEach((sub) => {
      byRoll.set(sub.roll.trim().toUpperCase(), sub)
    })

    specialRolls.forEach((sRoll) => {
      if (!byRoll.has(sRoll)) {
        const mRow = masterRows.find(
          (m) => m.rollNumber.trim().toUpperCase() === sRoll
        )
        byRoll.set(sRoll, {
          id: `special-override-${sRoll}-${selectedFormId}`,
          formId: selectedFormId,
          roll: sRoll,
          name: mRow ? (mRow.fullName || `${mRow.firstName} ${mRow.lastName}`.trim()) : 'Special Concern Student',
          mail: mRow?.mailId || '',
          values: {
            Branch: mRow?.branch || '',
            CGPA: mRow?.btechCgpa || '',
            'NO OF BACKLOGS': mRow?.activeBacklogs || '0',
          },
          submittedAt: new Date().toISOString(),
        } as any)
      }
    })

    const uniqueSubs = Array.from(byRoll.values())
    
    // Only exclude students placed in checked companies
    const excludedPlacements = placementsList.filter((p) =>
      excludedCompanies.includes(p.company.trim())
    )
    const placedRolls = new Set(excludedPlacements.map((p) => p.id.trim().toUpperCase()))

    const unplacedSubs = uniqueSubs.filter((sub) => {
      const subRoll = sub.roll.trim().toUpperCase()
      if (specialRolls.has(subRoll)) return true
      return !placedRolls.has(subRoll)
    })

    return unplacedSubs.filter((sub) => {
      const subRoll = sub.roll.trim().toUpperCase()
      if (specialRolls.has(subRoll)) {
        return true
      }

      const mRow = masterRows.find(
        (m) => m.rollNumber.trim().toUpperCase() === subRoll
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
  }, [allSubmissions, selectedFormId, placementsList, masterRows, filterBranch, filterMinCgpa, filterMaxBacklogs, filterSpecialConcerns, excludedCompanies])

  function getComparisonCellValue(row: any, colKey: string, masterRow?: any) {
    if (colKey === 'Roll Number') return row.roll
    if (colKey === 'Student Name') return row.name
    if (colKey === 'Branch') return masterRow?.branch || row.values['Branch'] || '-'
    if (colKey === 'CGPA') return masterRow?.btechCgpa || row.values['CGPA'] || '-'
    if (colKey === '10th %') return masterRow?.tenthPercentage || row.values['10th %'] || row.values['10TH'] || '-'
    if (colKey === '12th %') return masterRow?.twelfthPercentage || row.values['12th %'] || row.values['12TH'] || '-'
    if (colKey === 'Active Backlogs') return masterRow ? (masterRow.noOfBacklogs || masterRow.activeBacklogs || '0') : (row.values['Active Backlogs'] || row.values['NO OF BACKLOGS'] || '-')
    if (colKey === 'Email') return masterRow?.mailId || row.values['Email'] || row.values['Mail ID'] || '-'
    if (colKey === 'Phone') return masterRow?.phoneNumber || row.values['Phone'] || row.values['Phone Number'] || '-'
    if (colKey === 'Status') return 'Unplaced & Eligible'
    return row.values[colKey] || '-'
  }

  function handleDownloadComparisonList() {
    const form = formsList.find((f) => f.id === selectedFormId)
    if (!form) return

    const exportRows = dynamicComparisonList.map((submission) => {
      const masterRow = masterRows.find(
        (m) => m.rollNumber.trim().toUpperCase() === submission.roll.trim().toUpperCase()
      )
      const result: Record<string, string> = {}
      selectedComparisonColumns.forEach((colKey) => {
        result[colKey] = getComparisonCellValue(submission, colKey, masterRow)
      })
      return result
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
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted cursor-pointer print:hidden"
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRepoFilters(!showRepoFilters)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold cursor-pointer transition ${showRepoFilters ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
              >
                <Filter className="h-4 w-4" /> Filters
              </button>
              <button
                type="button"
                onClick={downloadOffersExcel}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download Excel
              </button>
            </div>
          </div>

          {showRepoFilters && (
            <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3 md:grid-cols-6 animate-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Company</label>
                <select
                  value={repoFilterCompany}
                  onChange={(e) => setRepoFilterCompany(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                >
                  <option value="All">All Companies</option>
                  {uniqueRepoCompanies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Role</label>
                <select
                  value={repoFilterRole}
                  onChange={(e) => setRepoFilterRole(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                >
                  <option value="All">All Roles</option>
                  {uniqueRepoRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Type</label>
                <select
                  value={repoFilterType}
                  onChange={(e) => setRepoFilterType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                >
                  <option value="All">All Types</option>
                  <option value="On-campus">On-campus</option>
                  <option value="Off-campus">Off-campus</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Branch</label>
                <select
                  value={repoFilterBranch}
                  onChange={(e) => setRepoFilterBranch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                >
                  <option value="All">All Branches</option>
                  {uniqueRepoBranches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Package (LPA)</label>
                <input
                  type="text"
                  placeholder="e.g. 5.0"
                  value={repoFilterPackage}
                  onChange={(e) => setRepoFilterPackage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={repoFilterDate}
                  onChange={(e) => setRepoFilterDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="col-span-full mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRepoFilterCompany('All')
                    setRepoFilterRole('All')
                    setRepoFilterType('All')
                    setRepoFilterBranch('All')
                    setRepoFilterPackage('')
                    setRepoFilterDate('')
                  }}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          <div className="card-surface overflow-hidden print:overflow-visible">
            <div className="overflow-x-auto print:overflow-visible">
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
                    <th className="px-5 py-3 font-medium text-right print:hidden">Actions</th>
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
                      <td className="px-5 py-3 print:hidden">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(allPlacements.indexOf(p))}
                            className="inline-flex h-8 items-center gap-1 rounded border border-input px-2 text-xs font-semibold hover:bg-muted cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteIdx(allPlacements.indexOf(p))}
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
                    <input type="text" required placeholder="e.g. rahul@example.com" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
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
                  <div className="border border-primary/20 bg-primary/5 p-3 rounded-lg space-y-1">
                    <label className="text-xs font-bold text-primary uppercase block">Allow Special Concern / Override Rolls</label>
                    <p className="text-[11px] text-muted-foreground">Enter Roll Numbers separated by commas to allow without eligibility checks (e.g. 21A91A0501, 21A91A0502)</p>
                    <input type="text" placeholder="Roll Numbers..." value={filterSpecialConcerns} onChange={(e) => setFilterSpecialConcerns(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono outline-none transition focus:border-ring" />
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
                <div className="border-b border-border px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-foreground">Eligible Students (Unplaced Only)</h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {dynamicComparisonList.length} qualified candidates match the current main-data filters.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowComparisonColSelector(!showComparisonColSelector)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                        showComparisonColSelector
                          ? 'border-primary bg-primary text-primary-foreground font-semibold'
                          : 'border-input bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      <Columns className="h-3.5 w-3.5" /> Columns
                    </button>
                  </div>
                </div>

                {/* Collapsible Column Selector */}
                {showComparisonColSelector && (
                  <div className="border-b border-border bg-muted/20 p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Select columns to display & download</span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedComparisonColumns(comparisonColumnsList.map((c) => c.key))}
                          className="text-primary hover:underline font-bold normal-case cursor-pointer text-xs"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedComparisonColumns(comparisonColumnsList.filter((c) => c.default).map((c) => c.key))}
                          className="text-primary hover:underline font-bold normal-case cursor-pointer text-xs"
                        >
                          Reset Defaults
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-40 overflow-y-auto pr-1">
                      {comparisonColumnsList.map((col) => (
                        <label
                          key={col.key}
                          className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background p-2 text-xs hover:bg-muted/40 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedComparisonColumns.includes(col.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedComparisonColumns([...selectedComparisonColumns, col.key])
                              } else {
                                setSelectedComparisonColumns(selectedComparisonColumns.filter((k) => k !== col.key))
                              }
                            }}
                            className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="font-medium text-foreground truncate">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                        {comparisonColumnsList.filter((col) => selectedComparisonColumns.includes(col.key)).map((col) => (
                          <th key={col.key} className="px-5 py-2.5 font-medium">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dynamicComparisonList.map((s) => {
                        const mRow = masterRows.find((m) => m.rollNumber.trim().toUpperCase() === s.roll.trim().toUpperCase())
                        return (
                          <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                            {comparisonColumnsList.filter((col) => selectedComparisonColumns.includes(col.key)).map((col) => {
                              const val = getComparisonCellValue(s, col.key, mRow)
                              if (col.key === 'Roll Number') {
                                return (
                                  <td key={col.key} className="px-5 py-2.5">
                                    <Link to={`/admin/students?search=${s.roll}`} className="text-primary hover:underline font-mono">
                                      {val}
                                    </Link>
                                  </td>
                                )
                              }
                              if (col.key === 'Status') {
                                return (
                                  <td key={col.key} className="px-5 py-2.5">
                                    <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                                      {val}
                                    </span>
                                  </td>
                                )
                              }
                              return (
                                <td
                                  key={col.key}
                                  className={`px-5 py-2.5 ${col.key === 'Roll Number' || col.key === '10th %' || col.key === '12th %' || col.key === 'CGPA' || col.key === 'Active Backlogs' ? 'font-mono' : ''} ${
                                    col.key === 'Student Name' ? 'font-bold text-foreground' : ''
                                  }`}
                                >
                                  {val}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                      {dynamicComparisonList.length === 0 && (
                        <tr>
                          <td colSpan={selectedComparisonColumns.length || 1} className="px-5 py-8 text-center text-muted-foreground italic">
                            No eligible unplaced candidates found for the selected drive/filters.
                          </td>
                        </tr>
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
                  <input type="text" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
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
              Are you sure you want to delete the placement record for <strong>{allPlacements[deleteIdx]?.student}</strong> at <strong>{allPlacements[deleteIdx]?.company}</strong>? This action cannot be undone.
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
