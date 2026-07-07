import { useState, useMemo } from 'react'
import {
  Building2,
  Users,
  Search,
  BarChart3,
  Download,
  Briefcase,
  Calendar,
  MapPin,
  Monitor,
  Wifi,
  Globe,
  FileText,
  GraduationCap,
  UserX,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  loadCompanies,
  loadPlacements,
  loadMasterRows,
  type PlacementOffer,
  useStoreState,
} from '../../lib/placeproStore'
import { getBranchAbbreviation } from '../../lib/utils'

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600',
  Completed: 'bg-slate-500/10 text-slate-500',
  Upcoming: 'bg-violet-500/10 text-violet-600',
}

const deptColors: Record<string, string> = {
  CSE: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
  IT: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/20',
  ECE: 'bg-amber-500/15 text-amber-700 border-amber-500/20',
  EE: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
  ME: 'bg-rose-500/15 text-rose-600 border-rose-500/20',
  CE: 'bg-teal-500/15 text-teal-600 border-teal-500/20',
  'CSE-ML': 'bg-indigo-500/15 text-indigo-600 border-indigo-500/20',
  'CSE-DS': 'bg-pink-500/15 text-pink-600 border-pink-500/20',
  EEE: 'bg-violet-500/15 text-violet-600 border-violet-500/20',
}

const deptBarColors: Record<string, string> = {
  CSE: 'bg-blue-500',
  IT: 'bg-cyan-500',
  ECE: 'bg-amber-500',
  EE: 'bg-orange-500',
  ME: 'bg-rose-500',
  CE: 'bg-teal-500',
  'CSE-ML': 'bg-indigo-500',
  'CSE-DS': 'bg-pink-500',
  EEE: 'bg-violet-500',
}

const branchPieColors: Record<string, string> = {
  CSE: '#3b82f6',     // blue
  IT: '#06b6d4',      // cyan
  ECE: '#f59e0b',     // amber/yellow
  EE: '#f97316',      // orange
  ME: '#f43f5e',      // rose/red
  CE: '#14b8a6',      // teal
  'CSE-ML': '#6366f1', // indigo
  'CSE-DS': '#ec4899', // pink
  EEE: '#8b5cf6',     // violet
}

const fallbackColors = [
  '#3b82f6',
  '#06b6d4',
  '#f59e0b',
  '#f97316',
  '#f43f5e',
  '#14b8a6',
  '#6366f1',
  '#8b5cf6',
]

const modeIcons: Record<string, typeof Monitor> = {
  Online: Wifi,
  Offline: Monitor,
  Hybrid: Globe,
}

export function AdminEligibilityPage() {
  const companies = useStoreState(loadCompanies) ?? []
  const placements = useStoreState(loadPlacements) ?? []
  const masterRows = useStoreState(loadMasterRows) ?? []
  const [search, setSearch] = useState('')
  const [filterJobType, setFilterJobType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Compute per-company analytics from placements
  const companyAnalytics = useMemo(() => {
    const analytics = new Map<
      string,
      {
        selections: number
        deptCounts: Record<string, number>
        latestDate: string
        students: PlacementOffer[]
      }
    >()

    companies.forEach((c) => {
      analytics.set(c.name, {
        selections: 0,
        deptCounts: {},
        latestDate: '',
        students: [],
      })
    })

    placements.forEach((p) => {
      const key = p.company
      if (!analytics.has(key)) {
        analytics.set(key, { selections: 0, deptCounts: {}, latestDate: '', students: [] })
      }
      const entry = analytics.get(key)!
      entry.selections++
      entry.students.push(p)
      
      const brAbbr = getBranchAbbreviation(p.branch)
      entry.deptCounts[brAbbr] = (entry.deptCounts[brAbbr] || 0) + 1
      if (!entry.latestDate || p.date > entry.latestDate) {
        entry.latestDate = p.date
      }
    })

    return analytics
  }, [companies, placements])

  // Summary stats
  const totalCompanies = companies.length
  const totalSelections = placements.length
  const totalStudents = masterRows.length

  // Unplaced students: total master rows minus unique placed roll numbers
  const placedRollNumbers = useMemo(() => {
    const rolls = new Set<string>()
    placements.forEach((p) => rolls.add(p.id.trim().toUpperCase()))
    return rolls
  }, [placements])

  const unplacedStudents = useMemo(() => {
    if (masterRows.length === 0) return 0
    const unplaced = masterRows.filter(
      (s) => !placedRollNumbers.has(s.rollNumber.trim().toUpperCase()),
    )
    return unplaced.length
  }, [masterRows, placedRollNumbers])

  const itCompanyCount = companies.filter((c) => c.jobType === 'IT').length
  const nonItCompanyCount = companies.filter((c) => c.jobType !== 'IT').length

  // Department-wise breakdown using master data for totals and placements for placed
  const globalDeptBreakdown = useMemo(() => {
    // Get total per branch from master data
    const totalByBranch: Record<string, number> = {}
    masterRows.forEach((s) => {
      const br = getBranchAbbreviation(s.branch)
      if (br) totalByBranch[br] = (totalByBranch[br] || 0) + 1
    })

    // Get placed per branch from placements
    const placedByBranch: Record<string, number> = {}
    placements.forEach((p) => {
      const br = getBranchAbbreviation(p.branch)
      if (br) placedByBranch[br] = (placedByBranch[br] || 0) + 1
    })

    // Merge all branches
    const allBrKeys = new Set([...Object.keys(totalByBranch), ...Object.keys(placedByBranch)])
    const result = Array.from(allBrKeys).map((br) => ({
      branch: br,
      total: totalByBranch[br] || 0,
      placed: placedByBranch[br] || 0,
      unplaced: (totalByBranch[br] || 0) - (placedByBranch[br] || 0),
    }))

    return result.sort((a, b) => b.total - a.total)
  }, [masterRows, placements])

  const maxDeptTotal = globalDeptBreakdown.length > 0 ? Math.max(...globalDeptBreakdown.map((d) => d.total)) : 1

  const allBranches = useMemo(() => {
    const branches = new Set<string>()
    // Use both master data and placements to gather branches
    masterRows.forEach((s) => {
      if (s.branch) branches.add(getBranchAbbreviation(s.branch))
    })
    placements.forEach((p) => {
      if (p.branch) branches.add(getBranchAbbreviation(p.branch))
    })
    if (branches.size === 0) {
      return ['CSE', 'IT', 'ECE', 'ME', 'EE', 'CE']
    }
    return Array.from(branches).sort()
  }, [masterRows, placements])

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchJobType =
        filterJobType === 'All' ||
        (filterJobType === 'IT' && c.jobType === 'IT') ||
        (filterJobType === 'Non-IT' && c.jobType !== 'IT')
      const matchStatus = filterStatus === 'All' || c.status === filterStatus
      return matchSearch && matchJobType && matchStatus
    })
  }, [companies, search, filterJobType, filterStatus])

  function getExportRows() {
    return filteredCompanies.map((c) => {
      const analytics = companyAnalytics.get(c.name)
      const branchData: Record<string, number> = {}
      allBranches.forEach((br) => {
        branchData[br] = analytics?.deptCounts[br] || 0
      })
      return {
        Company: c.name,
        'No. of Selections': analytics?.selections ?? 0,
        ...branchData,
        Date: analytics?.latestDate || '-',
        'Mode of Drive': c.mode,
        'IT/Non-IT': c.jobType === 'IT' ? 'IT' : 'Non-IT',
        Package: c.package,
        Status: c.status,
        Sector: c.sector,
        Location: c.location,
      }
    })
  }

  function handleExportExcel() {
    const exportRows = getExportRows()
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TPO Dashboard')
    XLSX.writeFile(workbook, 'tpo_dashboard_report.xlsx')
    showToast('TPO Dashboard report exported as Excel!')
  }

  function handleExportPdf() {
    const exportRows = getExportRows()
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const headers = Object.keys(exportRows[0] || {})
    const headerRow = headers.map((h) => `<th>${h}</th>`).join('')
    const bodyRows = exportRows
      .map(
        (row) =>
          `<tr>${headers.map((h) => `<td>${(row as Record<string, unknown>)[h] ?? '-'}</td>`).join('')}</tr>`,
      )
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>TPO Dashboard Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #1e3a8a; }
            .summary { display: flex; gap: 24px; justify-content: center; margin: 16px 0 24px; }
            .summary span { font-size: 13px; }
            .summary strong { color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #777; }
          </style>
        </head>
        <body>
          <h1>PlacePro - TPO Dashboard Report</h1>
          <div class="summary">
            <span>Total Companies: <strong>${totalCompanies}</strong></span>
            <span>Total Selections: <strong>${totalSelections}</strong></span>
            <span>Total Students: <strong>${totalStudents}</strong></span>
            <span>Unplaced: <strong>${unplacedStudents}</strong></span>
          </div>
          <p style="text-align:center; font-size: 11px; color: #666;">
            Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </p>
          <table>
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
          <div class="footer">PlacePro Placement Portal &copy; 2026 - Official Report</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
    showToast('TPO Dashboard PDF opened in print view.')
  }

  return (
    <>
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-pop animate-in fade-in duration-300">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            TPO Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centralized analytics hub — Company selections, department-wise counts, drive details, and placement trends.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted cursor-pointer transition"
          >
            <Download className="h-4 w-4" /> Download Excel
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer transition"
          >
            <FileText className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalCompanies}</div>
              <div className="text-xs text-muted-foreground font-medium">Total Companies</div>
            </div>
          </div>
        </div>

        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalSelections}</div>
              <div className="text-xs text-muted-foreground font-medium">Total Selections</div>
            </div>
          </div>
        </div>

        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalStudents}</div>
              <div className="text-xs text-muted-foreground font-medium">Total Students</div>
            </div>
          </div>
        </div>

        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10">
              <UserX className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{unplacedStudents}</div>
              <div className="text-xs text-muted-foreground font-medium">Unplaced Students</div>
            </div>
          </div>
        </div>

        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
              <Briefcase className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {itCompanyCount} <span className="text-base font-normal text-muted-foreground">IT</span>{' '}
                <span className="text-xs text-muted-foreground">·</span>{' '}
                {nonItCompanyCount} <span className="text-base font-normal text-muted-foreground">Non-IT</span>
              </div>
              <div className="text-xs text-muted-foreground font-medium">Company Split</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', 'IT', 'Non-IT'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterJobType(t)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                filterJobType === t
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {['All', 'Active', 'Completed', 'Upcoming'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                filterStatus === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Company Analytics Table */}
        <div className="lg:col-span-3 card-surface overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Company-wise Placement Analytics
            </h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {filteredCompanies.length} companies
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium text-center">Selections</th>
                  {allBranches.map((br) => (
                    <th key={br} className="px-4 py-3 font-medium text-center">{br}</th>
                  ))}
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Mode</th>
                  <th className="px-5 py-3 font-medium text-center">IT/Non-IT</th>
                  <th className="px-5 py-3 font-medium">Package</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => {
                  const analytics = companyAnalytics.get(c.name)
                  const selections = analytics?.selections ?? 0
                  const deptCounts = analytics?.deptCounts ?? {}
                  const latestDate = analytics?.latestDate || '-'
                  const ModeIcon = modeIcons[c.mode] || Monitor

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> {c.location} · {c.sector}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {selections}
                        </span>
                      </td>
                      {allBranches.map((br) => {
                        const count = deptCounts[br] || 0
                        return (
                          <td key={br} className="px-4 py-3 text-center">
                            {count > 0 ? (
                              <span className={`inline-flex h-6 px-2 items-center justify-center rounded-md font-bold text-xs ${deptColors[br] || 'bg-muted text-muted-foreground border-border border'}`}>
                                {count}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30 font-medium">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {latestDate !== '-'
                            ? new Date(latestDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                          <ModeIcon className="h-3 w-3" /> {c.mode}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            c.jobType === 'IT'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-orange-500/10 text-orange-600'
                          }`}
                        >
                          {c.jobType === 'IT' ? 'IT' : 'Non-IT'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-success text-xs">{c.package}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            statusColors[c.status] || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={7 + allBranches.length} className="px-5 py-12 text-center text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <div className="text-sm font-semibold">No companies match the current filters</div>
                      <div className="text-xs mt-1">Try adjusting your search or filter criteria.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Breakdown Side Panel */}
        <div className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" /> Branch-wise Breakdown
            </h3>
            {globalDeptBreakdown.length > 0 ? (
              <div className="space-y-3">
                {globalDeptBreakdown.map((dept) => (
                  <div key={dept.branch}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-foreground">{dept.branch}</span>
                      <span className="text-muted-foreground">
                        <span className="font-bold text-success">{dept.placed}</span>
                        <span className="mx-0.5">/</span>
                        <span className="font-semibold">{dept.total}</span>
                        <span className="text-[10px] font-normal ml-1">placed</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${deptBarColors[dept.branch] || 'bg-primary'}`}
                        style={{ width: `${maxDeptTotal > 0 ? (dept.placed / maxDeptTotal) * 100 : 0}%` }}
                      />
                    </div>
                    {dept.unplaced > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {dept.unplaced} unplaced
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No student data available yet. Upload master data in Students.
              </div>
            )}
          </div>

          {/* Branch Placement Share Pie Chart */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" /> Placed Students Share
            </h3>
            {globalDeptBreakdown.some((d) => d.placed > 0) ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={globalDeptBreakdown.filter((d) => d.placed > 0)}
                        dataKey="placed"
                        nameKey="branch"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                      >
                        {globalDeptBreakdown
                          .filter((d) => d.placed > 0)
                          .map((entry, idx) => (
                            <Cell
                              key={entry.branch}
                              fill={branchPieColors[entry.branch] || fallbackColors[idx % fallbackColors.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Dynamic Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {globalDeptBreakdown
                    .filter((d) => d.placed > 0)
                    .map((entry, idx) => (
                      <div key={entry.branch} className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              branchPieColors[entry.branch] || fallbackColors[idx % fallbackColors.length],
                          }}
                        />
                        <span className="truncate text-muted-foreground font-medium">{entry.branch}</span>
                        <span className="font-bold text-foreground ml-auto">{entry.placed}</span>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No students placed yet.
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-foreground text-sm mb-3">Quick Stats</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Active Drives</span>
                <span className="font-bold">{companies.filter((c) => c.status === 'Active').length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-bold">{companies.filter((c) => c.status === 'Completed').length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Upcoming</span>
                <span className="font-bold">{companies.filter((c) => c.status === 'Upcoming').length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Placement Rate</span>
                <span className="font-bold text-primary">
                  {totalStudents > 0
                    ? `${(((totalStudents - unplacedStudents) / totalStudents) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Top Placed Branch</span>
                <span className="font-bold text-primary">
                  {globalDeptBreakdown.length > 0
                    ? globalDeptBreakdown.sort((a, b) => b.placed - a.placed)[0].branch
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
