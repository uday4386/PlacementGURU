import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  Building2,
  Download,
  GraduationCap,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react'
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip,
  Legend
} from 'recharts'
import {
  loadMasterRows,
  loadCompanies,
  loadPlacements,
  useStoreState,
  type CompanyDrive,
} from '../../lib/placeproStore'
import {
  useAcademicYear,
} from '../../lib/AcademicYearContext'
import { getShortBranchName } from '../../lib/branchUtils'

// Helper to determine if a company is IT or Non-IT
function isItCompany(company: CompanyDrive) {
  const sector = (company.sector || '').toLowerCase()
  const name = (company.name || '').toLowerCase()
  const type = (company.type || '').toLowerCase()
  return (
    sector.includes('it') ||
    sector.includes('tech') ||
    sector.includes('software') ||
    sector.includes('internet') ||
    sector.includes('computer') ||
    name.includes('google') ||
    name.includes('amazon') ||
    name.includes('microsoft') ||
    name.includes('tcs') ||
    type.includes('it')
  )
}

export function AdminHomePage() {
  const { selectedYear } = useAcademicYear()
  const allStudents = useStoreState(loadMasterRows) ?? []
  const allCompanies = useStoreState(loadCompanies) ?? []
  const allPlacements = useStoreState(loadPlacements) ?? []

  // Filters state
  const [searchParams, setSearchParams] = useSearchParams()
  const searchTerm = searchParams.get('q') || ''
  const [itFilter, setItFilter] = useState<'All' | 'IT' | 'Non-IT'>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed' | 'Upcoming'>('All')

  // Since endpoints are scoped to selected Year on server side, we use them directly
  const students = allStudents
  const companies = allCompanies
  const placements = allPlacements

  // Statistics
  const totalCompaniesCount = companies.length
  
  const totalSelections = placements.length
  
  const totalStudentsCount = students.length

  const placedStudentRolls = useMemo(() => {
    return new Set(placements.map(p => p.id.trim().toUpperCase()))
  }, [placements])

  const totalPlacedCount = placedStudentRolls.size
  const unplacedCount = Math.max(0, totalStudentsCount - totalPlacedCount)

  const itCompaniesCount = companies.filter(isItCompany).length
  const nonItCompaniesCount = totalCompaniesCount - itCompaniesCount

  // Filtered companies list for the table
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const matchSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (company.sector || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (company.location || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const isIt = isItCompany(company)
      const matchIt = itFilter === 'All' || 
                      (itFilter === 'IT' && isIt) || 
                      (itFilter === 'Non-IT' && !isIt)

      const matchStatus = statusFilter === 'All' || company.status === statusFilter

      return matchSearch && matchIt && matchStatus
    })
  }, [companies, searchTerm, itFilter, statusFilter])

  // Extract unique short branches dynamically from student data or placement data
  const uniqueBranches = useMemo(() => {
    const branchSet = new Set<string>()
    students.forEach(s => {
      const short = getShortBranchName(s.branch)
      if (short && short !== '-') {
        branchSet.add(short)
      }
    })
    placements.forEach(p => {
      const short = getShortBranchName(p.branch)
      if (short && short !== '-') {
        branchSet.add(short)
      }
    })
    // Fallback if no data loaded
    if (branchSet.size === 0) {
      return ['CSE', 'CSE-DS', 'CSE-ML', 'ECE']
    }
    return Array.from(branchSet).sort()
  }, [students, placements])

  // Compute table row data: company placement analytics
  const tableData = useMemo(() => {
    return filteredCompanies.map(company => {
      const companyPlacements = placements.filter(
        p => p.company.toLowerCase() === company.name.toLowerCase()
      )

      const selections = companyPlacements.length

      // Count branch wise selections dynamically
      const branchHires: Record<string, number> = {}
      uniqueBranches.forEach(b => {
        branchHires[b] = 0
      })

      companyPlacements.forEach(p => {
        const shortBranch = getShortBranchName(p.branch)
        if (shortBranch in branchHires) {
          branchHires[shortBranch]++
        }
      })

      // Get latest or first placement date
      const dateStr = companyPlacements.length > 0 ? companyPlacements[0].date : '-'
      const isIt = isItCompany(company)

      return {
        id: company.id,
        name: company.name,
        location: company.location,
        selections,
        branchHires,
        date: dateStr,
        mode: company.mode || 'Online',
        itNonIt: isIt ? 'IT' : 'Non-IT',
        package: company.package || '-',
        status: company.status
      }
    })
  }, [filteredCompanies, placements, uniqueBranches])

  // Branch-wise Breakdown Sidebar stats
  const branchesSidebar = useMemo(() => {
    return uniqueBranches.map(branch => {
      // Find students in this branch
      const branchStudents = students.filter(s => getShortBranchName(s.branch) === branch)
      const totalInBranch = branchStudents.length

      // Find placed students in this branch
      const branchStudentRolls = new Set(branchStudents.map(s => s.rollNumber.trim().toUpperCase()))
      const placedInBranch = placements.filter(p => branchStudentRolls.has(p.id.trim().toUpperCase())).length

      const unplacedInBranch = Math.max(0, totalInBranch - placedInBranch)

      return {
        name: branch,
        placed: placedInBranch,
        total: totalInBranch,
        unplaced: unplacedInBranch
      }
    })
  }, [students, placements, uniqueBranches])

  // Placed Share Pie Chart Data
  const shareChartData = [
    { name: 'Placed', value: totalPlacedCount, color: 'oklch(62% 0.15 140)' },
    { name: 'Unplaced', value: unplacedCount, color: 'oklch(58% 0.18 28)' }
  ]

  // Quick stats
  const activeDrives = companies.filter(c => c.status === 'Active').length
  const completedDrives = companies.filter(c => c.status === 'Completed').length
  const upcomingDrives = companies.filter(c => c.status === 'Upcoming').length

  // Excel Export
  function exportToExcel() {
    const rows = tableData.map(row => {
      const rowData: Record<string, any> = {
        COMPANY: row.name,
        LOCATION: row.location,
        SELECTIONS: row.selections,
      }
      uniqueBranches.forEach(b => {
        rowData[b] = row.branchHires[b] || '-'
      })
      rowData['DATE'] = row.date
      rowData['MODE'] = row.mode
      rowData['IT/NON-IT'] = row.itNonIt
      rowData['PACKAGE'] = row.package
      rowData['STATUS'] = row.status
      return rowData
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Placement Analytics')
    XLSX.writeFile(workbook, `TPO-Dashboard-${selectedYear}.xlsx`)
  }

  return (
    <>
      {/* Dashboard Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            TPO Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centralized analytics hub — Company selections, department-wise counts, drive details, and placement trends.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            <Download className="h-4 w-4" /> Download Excel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer transition-opacity"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Five Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6">
        {[
          { icon: Building2, iconBg: 'bg-primary/10 text-primary', value: totalCompaniesCount, label: 'Total Companies' },
          { icon: GraduationCap, iconBg: 'bg-success/15 text-success', value: totalSelections, label: 'Total Selections' },
          { icon: Users, iconBg: 'bg-info/15 text-info-foreground', value: totalStudentsCount, label: 'Total Students' },
          { icon: Users, iconBg: 'bg-destructive/10 text-destructive', value: unplacedCount, label: 'Unplaced Students' },
          { icon: Briefcase, iconBg: 'bg-warning/15 text-warning-foreground', value: `${itCompaniesCount} IT · ${nonItCompaniesCount} Non-IT`, label: 'Company Split' },
        ].map((card, idx) => {
          const Icon = card.icon
          return (
            <div key={idx} className="card-surface card-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xl font-bold tracking-tight truncate">{card.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Grid Layout: Left Column Table, Right Column Sidebar */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column: Table & Filters (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filter Bar */}
          <div className="card-surface p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value
                  setSearchParams((prev) => {
                    if (val) {
                      prev.set('q', val)
                    } else {
                      prev.delete('q')
                    }
                    return prev
                  })
                }}
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* IT/Non-IT Filter */}
              <div className="flex rounded-lg border border-border p-1 bg-muted/20">
                {(['All', 'IT', 'Non-IT'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setItFilter(option)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      itFilter === option 
                        ? 'bg-card text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex rounded-lg border border-border p-1 bg-muted/20">
                {(['All', 'Active', 'Completed', 'Upcoming'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setStatusFilter(option)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      statusFilter === option 
                        ? 'bg-card text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Company-wise Placement Analytics Table */}
          <div className="card-surface overflow-hidden">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  Company-wise Placement Analytics
                </h3>
              </div>
              <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                {tableData.length} Companies
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground bg-muted/5">
                    <th className="px-5 py-3.5 font-semibold">Company</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Selections</th>
                    {uniqueBranches.map(branch => (
                      <th key={branch} className="px-3 py-3.5 font-semibold text-center">{branch}</th>
                    ))}
                    <th className="px-5 py-3.5 font-semibold">Date</th>
                    <th className="px-5 py-3.5 font-semibold">Mode</th>
                    <th className="px-5 py-3.5 font-semibold">IT/Non-IT</th>
                    <th className="px-5 py-3.5 font-semibold">Package</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-foreground">
                        <div>{row.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{row.location || 'Remote'}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary">
                          {row.selections}
                        </span>
                      </td>
                      {uniqueBranches.map(branch => (
                        <td key={branch} className="px-3 py-4 text-center font-semibold text-foreground">
                          {row.branchHires[branch] || '-'}
                        </td>
                      ))}
                      <td className="px-5 py-4 font-medium text-muted-foreground">{row.date}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                          {row.mode}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          row.itNonIt === 'IT' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {row.itNonIt}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-success">{row.package}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : row.status === 'Completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tableData.length === 0 && (
                    <tr>
                      <td colSpan={7 + uniqueBranches.length} className="px-5 py-12 text-center text-muted-foreground font-medium">
                        No company drive analytics found for the selected academic year.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Stats (Span 1) */}
        <div className="space-y-6">
          {/* Branch-wise Breakdown */}
          <div className="card-surface p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary" />
              Branch-wise Breakdown
            </h3>
            
            <div className="space-y-4.5">
              {branchesSidebar.map((branch) => {
                const percentage = branch.total > 0 ? Math.min(100, Math.round((branch.placed / branch.total) * 100)) : 0
                return (
                  <div key={branch.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-foreground">{branch.name}</span>
                      <span className="font-semibold text-success">{branch.placed} / {branch.total} Placed</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    
                    <div className="text-[10px] text-muted-foreground flex justify-between">
                      <span>{branch.unplaced} unplaced</span>
                      <span>{percentage}% placed</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Placed Students Share Card */}
          <div className="card-surface p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
              Placed Students Share
            </h3>

            {totalStudentsCount === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-muted-foreground italic border border-dashed rounded-lg">
                No students loaded in the database yet.
              </div>
            ) : totalPlacedCount === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-xs text-muted-foreground text-center gap-1 border border-dashed rounded-lg bg-muted/5">
                <AlertCircle className="h-5 w-5 text-muted-foreground/60" />
                <span>No students placed yet.</span>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shareChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {shareChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} Students`} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quick Stats Card */}
          <div className="card-surface p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
              Quick Stats
            </h3>
            
            <div className="space-y-3.5 text-sm font-semibold">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Active Drives
                </span>
                <span className="font-mono text-base font-bold">{activeDrives}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Completed Drives
                </span>
                <span className="font-mono text-base font-bold">{completedDrives}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Upcoming Drives
                </span>
                <span className="font-mono text-base font-bold">{upcomingDrives}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
