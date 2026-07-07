import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Edit, ExternalLink, MapPin, Plus, Search, Trash2, X, Calendar, DollarSign, FileSpreadsheet, Check, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  loadCompanies,
  saveCompanies,
  loadPlacements,
  savePlacements,
  loadMasterRows,
  type CompanyDrive,
  type PlacementOffer,
  useStoreState,
} from '../../lib/placeproStore'

const statusColors: Record<string, string> = {
  Active: 'bg-success/10 text-success',
  Completed: 'bg-muted text-muted-foreground',
  Upcoming: 'bg-info/15 text-info-foreground',
}

interface ParsedStudent {
  roll: string
  name: string
  email: string
  phone: string
  branch: string
  role: string
  company: string
  package: string
}

export function AdminCompaniesPage() {
  const navigate = useNavigate()

  const companiesList = useStoreState(loadCompanies) ?? []

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Creation/Edit Modal states
  const [isOpen, setIsOpen] = useState(false)
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [compName, setCompName] = useState('')
  const [sector, setSector] = useState('Technology')
  const [type, setType] = useState('Product')
  const [location, setLocation] = useState('Hyderabad')
  const [driveDate, setDriveDate] = useState('')
  const [driveMode, setDriveMode] = useState('Online')
  const [jobType, setJobType] = useState('IT')
  const [pkgMin, setPkgMin] = useState('')
  const [pkgMax, setPkgMax] = useState('')
  const [academicYear, setAcademicYear] = useState('2025–26')
  const [remarks, setRemarks] = useState('')

  // Detailed Modal view states
  const [viewingCompany, setViewingCompany] = useState<CompanyDrive | null>(null)

  // Excel Selection Upload state
  const [activeUploadCompId, setActiveUploadCompId] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([])
  const [excelFileName, setExcelFileName] = useState('')


  function handleDeleteCompany(companyId: string) {
    const company = companiesList.find((c) => c.id === companyId)
    if (!company) return
    if (!confirm(`Are you sure you want to delete "${company.name}"?\n\nThis will also remove all placement records associated with this company.`)) return

    // Remove the company
    const updatedCompanies = companiesList.filter((c) => c.id !== companyId)
    saveCompanies(updatedCompanies)

    // Also remove associated placements
    const currentPlacements = loadPlacements()
    const updatedPlacements = currentPlacements.filter(
      (p) => p.company.toLowerCase() !== company.name.toLowerCase()
    )
    savePlacements(updatedPlacements)

    showToast(`Deleted ${company.name} and its placement records.`)
  }

  const types = ['All', ...new Set(companiesList.map((c) => c.type))]

  const filtered = companiesList.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.remarks ?? '').toLowerCase().includes(search.toLowerCase()) ||
                        c.jobType.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'All' || c.type === filterType
    return matchSearch && matchType
  })

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>, companyId: string) {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelFileName(file.name)
    const company = companiesList.find((c) => c.id === companyId)
    const companyPkg = company ? company.package : '₹ 10 LPA'

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result
        if (!data) {
          showToast('Could not read file data.')
          return
        }
        const wb = XLSX.read(data, { type: 'array' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const rawData = XLSX.utils.sheet_to_json<any>(ws, { header: 1 })

        if (rawData.length === 0) {
          showToast('Excel file is empty.')
          return
        }

        const headers = rawData[0].map((h: any) => String(h || '').trim().toLowerCase())
        const rollIdx = headers.findIndex((h: string) => h.includes('roll') || h.includes('usn') || h.includes('id'))
        const nameIdx = headers.findIndex((h: string) => h.includes('name') || h.includes('student'))
        const emailIdx = headers.findIndex((h: string) => h.includes('email') || h.includes('mail'))
        const phoneIdx = headers.findIndex((h: string) => h.includes('phone') || h.includes('mobile') || h.includes('contact'))
        const branchIdx = headers.findIndex((h: string) => h.includes('department') || h.includes('dept') || h.includes('branch'))
        const roleIdx = headers.findIndex((h: string) => h.includes('role') || h.includes('designation') || h.includes('profile'))
        const companyIdx = headers.findIndex((h: string) => h.includes('company') || h.includes('org'))
        const pkgIdx = headers.findIndex((h: string) => h.includes('package') || h.includes('ctc') || h.includes('lpa'))

        if (rollIdx === -1) {
          showToast("Could not find a 'Roll Number' column in the Excel header.")
          return
        }

        const masterStudents = loadMasterRows() ?? []
        const masterMap = new Map(masterStudents.map((s) => [s.rollNumber.trim().toUpperCase(), s]))

        const students: ParsedStudent[] = []

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i]
          if (!row || row.length === 0) continue

          const rawRoll = String(row[rollIdx] ?? '').trim()
          if (!rawRoll) continue

          const roll = rawRoll.toUpperCase()
          const masterStudent = masterMap.get(roll)

          const name = masterStudent
            ? (masterStudent.fullName || `${masterStudent.firstName} ${masterStudent.lastName}`.trim())
            : (nameIdx !== -1 ? String(row[nameIdx] ?? '').trim() : 'Selected Student')

          const email = masterStudent
            ? masterStudent.mailId.trim()
            : (emailIdx !== -1 ? String(row[emailIdx] ?? '').trim() : '-')

          const phone = masterStudent
            ? masterStudent.phoneNumber.trim()
            : (phoneIdx !== -1 ? String(row[phoneIdx] ?? '').trim() : '-')
          
          const branch = masterStudent
            ? masterStudent.branch.trim()
            : (branchIdx !== -1 ? String(row[branchIdx] ?? '').trim() : (roll.startsWith('CSE') ? 'CSE' : 'IT'))

          const pkg = pkgIdx !== -1 && row[pkgIdx] !== undefined
            ? `₹ ${row[pkgIdx]} LPA`
            : companyPkg

          const role = roleIdx !== -1 && row[roleIdx] !== undefined
            ? String(row[roleIdx]).trim()
            : (company ? `${company.jobType} Engineer` : 'Graduate Engineer')

          const companyName = companyIdx !== -1 && row[companyIdx] !== undefined
            ? String(row[companyIdx]).trim()
            : (company ? company.name : 'Unknown')

          students.push({ roll, name, email, phone, branch, package: pkg, role, company: companyName })
        }

        if (students.length === 0) {
          showToast('No valid student rows found in the Excel file.')
          return
        }

        setParsedStudents(students)
        setActiveUploadCompId(companyId)
        setViewingCompany(null)
        setShowPreviewModal(true)
      } catch (err) {
        console.error(err)
        showToast('Error reading Excel file.')
      }
    }
    reader.readAsArrayBuffer(file)
    if (e.target) e.target.value = ''
  }

  async function confirmExcelSelectionImport() {
    if (!activeUploadCompId || parsedStudents.length === 0) return

    const companyIndex = companiesList.findIndex((c) => c.id === activeUploadCompId)
    if (companyIndex === -1) return

    const company = companiesList[companyIndex]
    const updatedCompanies = [...companiesList]
    updatedCompanies[companyIndex] = {
      ...company,
      hires: parsedStudents.length,
      status: 'Completed'
    }
    saveCompanies(updatedCompanies)

    const currentPlacements = loadPlacements()
    const newOffers: PlacementOffer[] = parsedStudents.map((student) => ({
      student: student.name,
      id: student.roll,
      branch: student.branch,
      company: company.name,
      role: student.role,
      package: student.package,
      date: new Date().toISOString().split('T')[0],
      type: 'On-campus',
      email: student.email,
      phone: student.phone,
    }))

    const filteredCurrent = currentPlacements.filter(
      (cp) => !(cp.company.toLowerCase() === company.name.toLowerCase())
    )

    try {
      await savePlacements([...newOffers, ...filteredCurrent])
      showToast(`Successfully uploaded selection list! Added ${newOffers.length} offers for ${company.name}.`)
      setShowPreviewModal(false)
      setParsedStudents([])
      setActiveUploadCompId(null)
      navigate('/admin/placements')
    } catch (err) {
      console.error(err)
      showToast('Failed to save selection list to the database.')
    }
  }

  function downloadCompanySelections(company: CompanyDrive) {
    const allPlacements = loadPlacements()
    const companyPlacements = allPlacements.filter(
      (p) => p.company.toLowerCase() === company.name.toLowerCase()
    )
    if (companyPlacements.length === 0) {
      showToast(`No placed students found for ${company.name}.`)
      return
    }
    const exportRows = companyPlacements.map((p) => ({
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Selections')
    XLSX.writeFile(workbook, `${company.name.replace(/\s+/g, '_')}_selections.xlsx`)
    showToast(`Downloaded ${companyPlacements.length} selections for ${company.name}.`)
  }

  function openEditCompanyModal(company: CompanyDrive) {
    setEditingCompanyId(company.id)
    setCompName(company.name)
    setSector(company.sector)
    setType(company.type)
    setLocation(company.location)
    setDriveMode(company.mode)
    setJobType(company.jobType)
    setAcademicYear(company.academicYear)
    setRemarks(company.remarks ?? '')
    
    // Parse package range like "₹ 44–48 LPA" -> min=44, max=48
    const pkgMatch = company.package.match(/(\d+\.?\d*).*?(\d+\.?\d*)/)
    if (pkgMatch) {
      setPkgMin(pkgMatch[1])
      setPkgMax(pkgMatch[2])
    } else {
      setPkgMin('')
      setPkgMax('')
    }
    
    setDriveDate('')
    setIsOpen(true)
  }

  function handleCreateDrive(e: React.FormEvent) {
    e.preventDefault()
    if (!compName || !pkgMin || !pkgMax) return

    if (editingCompanyId) {
      // Update existing company
      const updated = companiesList.map((c) =>
        c.id === editingCompanyId
          ? {
              ...c,
              name: compName.trim(),
              sector,
              type,
              location: location.trim(),
              package: `₹ ${pkgMin}–${pkgMax} LPA`,
              mode: driveMode,
              jobType,
              academicYear,
              remarks: remarks.trim(),
            }
          : c
      )
      saveCompanies(updated)
      showToast(`Updated ${compName.trim()} successfully!`)
    } else {
      // Create new company
      const newDrive: CompanyDrive = {
        id: `COMP-${String(companiesList.length + 1).padStart(3, '0')}`,
        name: compName.trim(),
        sector,
        type,
        location: location.trim(),
        drives: 1,
        hires: 0,
        package: `₹ ${pkgMin}–${pkgMax} LPA`,
        status: 'Upcoming',
        mode: driveMode,
        jobType,
        academicYear,
        remarks: remarks.trim(),
      }
      saveCompanies([newDrive, ...companiesList])
      showToast(`Created drive for ${newDrive.name} successfully!`)
    }

    setIsOpen(false)
    resetModal()
  }

  function resetModal() {
    setEditingCompanyId(null)
    setCompName('')
    setSector('Technology')
    setType('Product')
    setLocation('Hyderabad')
    setDriveDate('')
    setDriveMode('Online')
    setJobType('IT')
    setPkgMin('')
    setPkgMax('')
    setAcademicYear('2025–26')
    setRemarks('')
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage recruiting partners, specify job modes, packages, academic schedules, and create placement drives.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetModal()
            setIsOpen(true)
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add company
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search companies by name, job type, or remarks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                filterType === t
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="card-surface card-hover p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColors[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold">{c.name}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {c.location} · {c.sector}
              </p>

              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>Type: <span className="font-semibold text-foreground">{c.jobType} · {c.type}</span></div>
                <div>Mode: <span className="font-semibold text-foreground">{c.mode}</span></div>
                {c.remarks && <div className="text-[10px] italic mt-1 font-sans">{c.remarks}</div>}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs border-t border-border pt-3">
                <div className="rounded-lg bg-muted/60 p-2 text-center">
                  <div className="font-bold text-base">{c.drives}</div>
                  <div className="text-[10px] text-muted-foreground">Drives</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-2 text-center">
                  <div className="font-bold text-base">{c.hires}</div>
                  <div className="text-[10px] text-muted-foreground">Hires</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-2 text-center flex flex-col justify-center">
                  <div className="font-bold text-[10px] leading-tight truncate">{c.package}</div>
                  <div className="text-[9px] text-muted-foreground">Package</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setViewingCompany(c)}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary hover:bg-primary/10 cursor-pointer transition"
                >
                  <ExternalLink className="h-4 w-4" /> View Details
                </button>
                <button
                  type="button"
                  onClick={() => openEditCompanyModal(c)}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 cursor-pointer transition dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                >
                  <Edit className="h-4 w-4" /> Edit
                </button>
                <label className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer transition dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">
                  <FileSpreadsheet className="h-4 w-4" />
                  Upload Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => handleExcelUpload(e, c.id)}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => downloadCompanySelections(c)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer transition dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCompany(c.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 cursor-pointer transition"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Company Drive Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => { setIsOpen(false); resetModal(); }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-foreground">
              {editingCompanyId ? 'Edit Company Drive' : 'Create Company Drive'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {editingCompanyId
                ? 'Update the company drive details below.'
                : 'Configure company profiles, select job modes, package bounds, and target academic years.'}
            </p>

            <form onSubmit={handleCreateDrive} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Uber"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Sector</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  >
                    <option value="Technology">Technology</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Finance">Finance</option>
                    <option value="IT Services">IT Services</option>
                    <option value="Core Engineering">Core Engineering</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Job Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  >
                    <option value="Product">Product Company</option>
                    <option value="Service">Service Company</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Job Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Drive Mode</label>
                  <select
                    value={driveMode}
                    onChange={(e) => setDriveMode(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Job Type</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  >
                    <option value="IT">IT</option>
                    <option value="Core">Core</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Analytics">Analytics</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Academic Year</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
                  >
                    <option value="2025–26">2025–26</option>
                    <option value="2026–27">2026–27</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Drive Date</label>
                  <input
                    type="date"
                    value={driveDate}
                    onChange={(e) => setDriveDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Min Package (LPA)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 12"
                    value={pkgMin}
                    onChange={(e) => setPkgMin(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Max Package (LPA)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15"
                    value={pkgMax}
                    onChange={(e) => setPkgMax(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Remarks</label>
                <textarea
                  placeholder="Additional eligibility instructions…"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="mt-1.5 h-20 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); resetModal(); }}
                  className="h-10 px-4 rounded-lg border border-input text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
                >
                  {editingCompanyId ? 'Save Changes' : 'Create Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {viewingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => setViewingCompany(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{viewingCompany.name}</h2>
                <p className="text-xs text-muted-foreground">{viewingCompany.sector} · {viewingCompany.location}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-4 w-4" /> Academic Year:</span>
                <span className="font-semibold">{viewingCompany.academicYear}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Drive Mode:</span>
                <span className="font-semibold rounded bg-muted px-1.5 py-0.5 text-xs">{viewingCompany.mode}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Job Type:</span>
                <span className="font-semibold rounded bg-muted px-1.5 py-0.5 text-xs">{viewingCompany.jobType}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-4 w-4" /> Package:</span>
                <span className="font-bold text-success">{viewingCompany.package}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Drives Conducted:</span>
                <span className="font-semibold">{viewingCompany.drives}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Selections/Hires:</span>
                <span className="font-semibold">{viewingCompany.hires} students placed</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-muted-foreground">Upload Selections:</span>
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer transition">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                  Select Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => {
                      handleExcelUpload(e, viewingCompany.id);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Company Remarks & Guidance</span>
                <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs leading-relaxed text-muted-foreground">
                  {viewingCompany.remarks || 'No additional remarks provided.'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => downloadCompanySelections(viewingCompany)}
                className="h-10 px-4 rounded-lg border border-blue-400/30 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 flex items-center gap-2 cursor-pointer transition dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              >
                <Download className="h-4 w-4" /> Download Selections
              </button>
              <button
                type="button"
                onClick={() => {
                  openEditCompanyModal(viewingCompany)
                  setViewingCompany(null)
                }}
                className="h-10 px-4 rounded-lg border border-input text-sm font-semibold hover:bg-muted flex items-center gap-2 cursor-pointer"
              >
                <Edit className="h-4 w-4" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setViewingCompany(null)}
                className="h-10 px-4 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Selection Import Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setShowPreviewModal(false)
                setParsedStudents([])
                setActiveUploadCompId(null)
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              Confirm Excel Selection Upload
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              File: <span className="font-mono text-primary font-bold">{excelFileName}</span> · Found <span className="font-bold text-success text-sm">{parsedStudents.length}</span> students.
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Format: Roll Number, Full Name, Email, Phone Number, Department, Role, Company, Package
            </p>

            <div className="mt-4 border border-border rounded-lg max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="px-3 py-2.5">Roll Number</th>
                    <th className="px-3 py-2.5">Full Name</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Department</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Company</th>
                    <th className="px-3 py-2.5">Package</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedStudents.map((row, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono">{row.roll}</td>
                      <td className="px-3 py-2 font-semibold">{row.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.phone}</td>
                      <td className="px-3 py-2">{row.branch}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.role}</td>
                      <td className="px-3 py-2 font-semibold">{row.company}</td>
                      <td className="px-3 py-2 font-semibold text-success">{row.package}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false)
                  setParsedStudents([])
                  setActiveUploadCompId(null)
                }}
                className="h-10 px-4 rounded-lg border border-input text-sm font-semibold hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExcelSelectionImport}
                className="h-10 px-4 rounded-lg bg-success text-sm font-semibold text-success-foreground shadow-pop hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" /> Confirm & Import to Placements
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
